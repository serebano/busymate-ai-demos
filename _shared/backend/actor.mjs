// sites/_shared/backend/actor.mjs
//
// Who is asking, on a delegated MCP call.
//
// A tool marked `identified`/`delegated` must work the customer out from the
// bearer the platform signed — NEVER from an id in the tool's own arguments,
// which the model can set to anything (docs/guides/connect-mcp-server, "the one
// rule that makes it safe"). This module is that check, shared by every demo.
//
// It FAILS CLOSED: the key set comes from the token header's `jku`, from
// BMAI_ACTOR_JWKS_URL, or from the issuer's /.well-known/jwks.json — only ever
// a busymate.ai origin — and a token whose signature cannot be verified against
// one of those identifies nobody.
import crypto from "node:crypto";

const ISSUER = "https://busymate.ai";
const ALLOWED_JWKS_HOST = /(^|\.)busymate\.ai$/;
const SKEW_SECONDS = 60;
const CACHE_MS = 5 * 60 * 1000;

const jwksCache = new Map();
const probes = [];

const fromB64url = (s) => Buffer.from(s, "base64url");
const decodeSegment = (s) => {
  try { return JSON.parse(fromB64url(s).toString("utf8")); } catch { return null; }
};

/**
 * The last few delegated calls, as SHAPES only — algorithm, whether a key id or
 * a key-set hint was present, which claim checks passed. No token, no subject,
 * no claim value is ever recorded, so this is safe to expose to an operator.
 */
export function actorProbe() {
  return probes.slice(-20);
}

function record(entry) {
  probes.push({ at: new Date().toISOString(), ...entry });
  if (probes.length > 50) probes.splice(0, probes.length - 50);
}

async function fetchJwks(url) {
  const hit = jwksCache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.keys;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`jwks_${res.status}`);
  const body = await res.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  jwksCache.set(url, { at: Date.now(), keys });
  return keys;
}

function candidateJwksUrls(header, issuer) {
  const out = [];
  const push = (candidate) => {
    if (!candidate) return;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "https:" && ALLOWED_JWKS_HOST.test(parsed.hostname)) out.push(parsed.toString());
    } catch { /* an unusable URL is simply not a candidate */ }
  };
  push(header?.jku);
  push(process.env.BMAI_ACTOR_JWKS_URL);
  push(`${issuer || ISSUER}/.well-known/jwks.json`);
  return [...new Set(out)];
}

const KEY_SPECS = {
  ES256: { curve: "P-256", hash: "sha256", dsaEncoding: "ieee-p1363" },
  ES384: { curve: "P-384", hash: "sha384", dsaEncoding: "ieee-p1363" },
  RS256: { hash: "sha256" },
};

async function signatureVerifies(header, signingInput, signature, issuer) {
  const spec = KEY_SPECS[header?.alg];
  if (!spec) return false;
  for (const url of candidateJwksUrls(header, issuer)) {
    let keys;
    try { keys = await fetchJwks(url); } catch { continue; }
    for (const jwk of keys) {
      if (header.kid && jwk.kid && jwk.kid !== header.kid) continue;
      if (jwk.alg && jwk.alg !== header.alg) continue;
      try {
        const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
        const options = spec.dsaEncoding ? { key, dsaEncoding: spec.dsaEncoding } : key;
        if (crypto.verify(spec.hash, Buffer.from(signingInput), options, signature)) return true;
      } catch { /* try the next key */ }
    }
  }
  return false;
}

// ── the HS256 actor token ──────────────────────────────────────────────────
// What the platform ACTUALLY mints for `delegation_mode: "signed_actor_token"`:
// an HS256 JWT signed with a per-connector secret the tenant installs itself
// (Console › Connections, or `set_connector_actor_verifier`). This is the
// canonical partner-kit check (`whitelabel/partner-kit/src/bmai-identity.mjs`
// → `verifyBmaiActorToken`), mirrored assertion for assertion:
//
//   • the algorithm is HARDCODED, never read from the header to choose a path
//     (the alg-confusion class) — HS256 with the pinned kid or nothing;
//   • signature, then issuer, audience, tenant id, connector id, subject,
//     session id, jti, and a lifetime that cannot exceed five minutes;
//   • the comparison is constant-time.
//
// Without all four of the environment values below there is no verifier, so
// the arm returns null and the caller stays unidentified — which is why
// `ACTOR_VERIFIER_READY` must only ever be set on a container that has them.
const ACTOR_KID = "bmai-support-v2";
const ACTOR_MAX_TTL_SECONDS = 300;

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * @param {string} token
 * @param {{audience?: string}} expected
 * @returns {{sub: string} | null}
 */
function verifyHs256ActorToken(token, expected) {
  const env = process.env;
  const secretText = String(env.BMAI_SUPPORT_ACTOR_SECRET ?? "");
  const tenantId = String(env.BMAI_SUPPORT_TENANT_ID ?? "");
  const connectorId = String(env.BMAI_SUPPORT_CONNECTOR_ID ?? "");
  const audience = String(env.BMAI_SUPPORT_AUDIENCE ?? expected.audience ?? "");
  if (!secretText || !tenantId || !connectorId || !audience) return null;

  const [headerPart, payloadPart, signaturePart] = String(token).split(".");
  if (!headerPart || !payloadPart || !signaturePart) return null;
  const header = decodeSegment(headerPart);
  const payload = decodeSegment(payloadPart);
  if (!header || !payload) return null;
  if (header.alg !== "HS256" || header.typ !== "JWT" || header.kid !== ACTOR_KID) return null;

  const secret = Buffer.from(secretText, "base64url");
  if (secret.length < 32) return null;
  const computed = crypto.createHmac("sha256", secret).update(`${headerPart}.${payloadPart}`).digest("base64url");
  if (!timingSafeEqual(computed, signaturePart)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== ISSUER
    || payload.aud !== audience
    || payload.tenant_id !== tenantId
    || payload.connector_id !== connectorId
    || typeof payload.sub !== "string" || !payload.sub
    || typeof payload.support_session_id !== "string" || !payload.support_session_id
    || typeof payload.jti !== "string" || !payload.jti
    || typeof payload.iat !== "number" || typeof payload.nbf !== "number" || typeof payload.exp !== "number"
    || payload.iat > now + SKEW_SECONDS || payload.nbf > now + SKEW_SECONDS || payload.exp <= now
    || payload.exp - payload.iat > ACTOR_MAX_TTL_SECONDS
  ) return null;
  return { sub: payload.sub };
}

/**
 * Verify a delegated bearer and return the customer id it identifies.
 *
 * @param {string|undefined} authorization raw Authorization header
 * @param {{audience?: string, issuer?: string}} [expected]
 * @returns {Promise<{ok: true, subject: string} | {ok: false, reason: string}>}
 */
export async function verifyActorToken(authorization, expected = {}) {
  const raw = /^Bearer\s+(.+)$/i.exec(String(authorization ?? "").trim())?.[1];
  if (!raw) { record({ outcome: "no_bearer" }); return { ok: false, reason: "no_bearer" }; }

  // The HS256 arm first: it is the shape the platform mints today, and it is a
  // cheap local HMAC with no network call. A token that is not one falls
  // through to the asymmetric arm below rather than being rejected here.
  const hmac = verifyHs256ActorToken(raw, expected);
  if (hmac) {
    record({ outcome: "verified", alg: "HS256", hasKid: true, hasJku: false, issuerMatches: true, audienceMatches: true, hasSubject: true, expired: false });
    return { ok: true, subject: hmac.sub };
  }
  const parts = raw.split(".");
  if (parts.length !== 3) { record({ outcome: "not_a_jwt" }); return { ok: false, reason: "not_a_jwt" }; }
  const header = decodeSegment(parts[0]);
  const claims = decodeSegment(parts[1]);
  if (!header || !claims) { record({ outcome: "undecodable" }); return { ok: false, reason: "undecodable" }; }

  const issuer = expected.issuer || ISSUER;
  const now = Math.floor(Date.now() / 1000);
  const audienceOk = !expected.audience
    || claims.aud === expected.audience
    || (Array.isArray(claims.aud) && claims.aud.includes(expected.audience));
  const shape = {
    alg: header.alg ?? null,
    hasKid: Boolean(header.kid),
    hasJku: Boolean(header.jku),
    issuerMatches: claims.iss === issuer,
    audienceMatches: audienceOk,
    hasSubject: typeof claims.sub === "string" && claims.sub.length > 0,
    expired: typeof claims.exp === "number" ? claims.exp + SKEW_SECONDS < now : null,
  };

  if (!shape.issuerMatches) { record({ outcome: "bad_issuer", ...shape }); return { ok: false, reason: "bad_issuer" }; }
  if (!shape.audienceMatches) { record({ outcome: "bad_audience", ...shape }); return { ok: false, reason: "bad_audience" }; }
  if (!shape.hasSubject) { record({ outcome: "no_subject", ...shape }); return { ok: false, reason: "no_subject" }; }
  if (shape.expired === true) { record({ outcome: "expired", ...shape }); return { ok: false, reason: "expired" }; }

  const verified = await signatureVerifies(header, `${parts[0]}.${parts[1]}`, fromB64url(parts[2]), issuer);
  record({ outcome: verified ? "verified" : "signature_unverified", ...shape });
  return verified ? { ok: true, subject: claims.sub } : { ok: false, reason: "signature_unverified" };
}
