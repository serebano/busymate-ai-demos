// sites/_shared/backend/mcp-identity-server.mjs
//
// Reusable, dependency-free (Node core only) backend for a "full-feature"
// Busymate AI integration demo: it is BOTH
//   (a) the tenant-owned identity provider (docs/guides/identified-visitors):
//       generates + persists an ES256 keypair, serves the JWKS, and mints a
//       120s one-time launch proof for a demo customer who "signs in", and
//   (b) a tiny MCP server (JSON-RPC 2.0 over HTTP) exposing this demo's
//       store data as tools (list/search products, order status, start a
//       return) — connected to the tenant via `upsert_tenant_connector`.
//
// One process per demo (own Docker container, own port). Every demo passes
// its own catalog/orders/copy into `start(config)`; this file has NO
// per-demo content so every future "full-feature" demo reuses it verbatim.
//
// Deliberately zero npm dependencies: JWT signing uses node:crypto's raw
// ES256 (P-256 + SHA-256, IEEE P1363 signature encoding) directly, so the
// Docker image is just `node:20-alpine` + this file, no `npm install`.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { actorProbe, verifyActorToken } from "./actor.mjs";

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const nowSec = () => Math.floor(Date.now() / 1000);

function ensureKeypair(keyDir) {
  fs.mkdirSync(keyDir, { recursive: true });
  const privPath = path.join(keyDir, "identity-ec-private.pem");
  const pubPath = path.join(keyDir, "identity-ec-public.pem");
  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    return {
      privateKey: crypto.createPrivateKey(fs.readFileSync(privPath)),
      publicKey: crypto.createPublicKey(fs.readFileSync(pubPath)),
    };
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  fs.writeFileSync(privPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  fs.writeFileSync(pubPath, publicKey.export({ type: "spki", format: "pem" }));
  return { privateKey, publicKey };
}

function jwkFromPublicKey(publicKey, kid) {
  const jwk = publicKey.export({ format: "jwk" }); // { kty:'EC', crv:'P-256', x, y }
  return { ...jwk, kid, use: "sig", alg: "ES256", key_ops: ["verify"] };
}

function signES256(privateKey, header, payload) {
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.sign("sha256", Buffer.from(signingInput), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(sig)}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const NONCE_RE = /^[A-Za-z0-9_-]{32,200}$/;

/**
 * The EXACT `return_to`, when its origin is one this demo will hand a launch
 * proof to — this demo's own origin, or a HOSTED origin the tenant's assistant
 * actually lives at (its `<slug>.busymate.ai` page, and the platform apex used
 * by `busymate.ai/support/<slug>` / `busymate.ai/chat/<id>`) — the shop's own
 * front page otherwise. Compared on the parsed `URL().origin`, NEVER a string
 * prefix: `https://busymate.ai.evil.test` must not pass, and neither may
 * `https://evil.example/?x=https://busymate.ai`.
 *
 * Getting this wrong (pinning every return to this demo's own origin) is what
 * shipped broken: the platform's hosted assistant page sends
 * `return_to=<its own page>`, and a customer who is genuinely signed in lands
 * on the shop's front page instead — the conversation that sent them stays a
 * guest forever (serebano/busymate-devtools#2865).
 */
function resolveReturnTo(requested, issuer, hostedOrigins) {
  let destination;
  try {
    destination = new URL(requested, issuer);
  } catch {
    return new URL("/", issuer);
  }
  const allowed = new Set([new URL(issuer).origin, ...(hostedOrigins ?? [])]);
  return allowed.has(destination.origin) ? destination : new URL("/", issuer);
}

/**
 * The nonce the platform is waiting to see ECHOED back, when it is well-formed
 * — the launch pair is BOUND to it, so minting a fresh one here signs a
 * perfectly valid token the platform must reject (same issue: a customer
 * looks like their sign-in failed when it didn't). A fresh nonce is minted
 * only when none was supplied at all — the direct full-page open, where
 * nobody asked for a value.
 */
function nonceOrFresh(candidate) {
  return candidate && NONCE_RE.test(candidate) ? candidate : crypto.randomBytes(24).toString("base64url");
}

// Exported for sites/_shared/backend/mcp-identity-server.test.mjs and for a
// demo's own `routes` override that wants the same allowlist/echo behaviour
// without duplicating it (see `ctx.resolveReturnTo` / `ctx.nonceOrFresh`).
export { resolveReturnTo, nonceOrFresh };

/**
 * @param {object} config
 * @param {number} config.port
 * @param {string} config.issuer            e.g. https://shopify.demo.busymate.ai
 * @param {string} config.tenantId          the bmai tenant uuid this proof is bound to
 * @param {string} [config.audience]        default "busymate-ai"
 * @param {string} config.keyDir            persistent volume path for the ES256 keys
 * @param {string} config.wellKnownDir      docroot/.well-known — jwks.json is written here (served statically by nginx)
 * @param {{id:string,name:string,email:string}} config.demoCustomer
 * @param {Record<string, {description:string, inputSchema:object, readOnlyHint?:boolean, accessHint?:string, confirmHint?:boolean, handler:(args:object)=>object}>} config.tools
 *   The demo's own MCP tool table — name -> {description, inputSchema, handler(args), ...}.
 *   Every demo defines its own (its catalog/orders are store-shaped); this
 *   server has NO product/order assumptions baked in, only identity + a
 *   generic JSON-RPC dispatcher over whatever `tools` it's handed. Build
 *   the table with sites/_shared/backend/tool-schema.mjs's `toolsFor()` +
 *   your handlers (see sites/shopify/backend/index.mjs), or write your own.
 *   Mark a tool `accessHint: "delegated"` and it is served ONLY to a caller
 *   presenting the platform's verified actor token; its handler is then called
 *   as `handler(args, { customerId })` with the customer taken from that
 *   token's signed subject — never from a tool argument the model controls.
 * @param {(req:object, res:object, url:URL, ctx:{customer:object|null, json:(status:number, body:object)=>void, body:()=>Promise<string>}) => boolean|Promise<boolean>} [config.routes]
 *   The demo's own HTTP routes, tried before this server's 404 — the same data
 *   its page tools read from the browser. Return true once the response is
 *   written, false to fall through. `ctx.customer` is the signed-in demo
 *   customer for this request, or null.
 * @param {string} [config.namespace]
 *   Slug used for this demo's `ui://` resource ids. Defaults to the store name.
 * @param {Record<string,string>} [config.wellKnownFiles]
 *   Extra files to publish under `/.well-known/` — name -> local path. The
 *   static deploy EXCLUDES that directory (the container owns it, for jwks.json),
 *   so anything a demo wants served from there is copied in at boot.
 * @param {string} [config.storeName]
 * @param {string[]} [config.hostedOrigins]
 *   Extra origins (full `https://host` strings, e.g. `https://demo-shopify.busymate.ai`)
 *   the `/api/identity/start` redirect (and a demo's own `routes` override, via
 *   `ctx.resolveReturnTo`) may send a visitor's `return_to` BACK to, besides this
 *   demo's own issuer origin — the tenant's hosted-assistant page(s). Compared
 *   on the parsed origin only, never a prefix. Defaults to none (this demo's
 *   own origin only), which is what broke every hosted-page sign-in
 *   (serebano/busymate-devtools#2865) before this was named explicitly.
 */
export function start(config) {
  const {
    port, issuer, tenantId, audience = "busymate-ai", keyDir, wellKnownDir,
    demoCustomer, tools, routes, wellKnownFiles, storeName = "the store", hostedOrigins = [],
    namespace = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    // A delegated tool is only ADVERTISED once this server can actually verify a
    // delegated caller. The platform mints the actor bearer as HS256 signed with
    // a per-connector secret an operator installs; until that secret is here,
    // advertising the tool would offer a capability that can only ever refuse.
    delegationReady = process.env.ACTOR_VERIFIER_READY === "1",
  } = config;

  const { privateKey, publicKey } = ensureKeypair(keyDir);
  const kid = "demo-2026-09";
  const jwks = { keys: [jwkFromPublicKey(publicKey, kid)] };
  fs.mkdirSync(wellKnownDir, { recursive: true });
  fs.writeFileSync(path.join(wellKnownDir, "jwks.json"), JSON.stringify(jwks, null, 2));
  for (const [fileName, source] of Object.entries(wellKnownFiles ?? {})) {
    try {
      fs.copyFileSync(source, path.join(wellKnownDir, fileName));
    } catch (error) {
      console.error(`[${storeName}] could not publish /.well-known/${fileName}:`, error.message);
    }
  }

  const SESSION_COOKIE = (sid) =>
    `demo_session=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;

  /** One launch proof for `customer`, echoing `nonce`. Used by both the embed's
   *  getIdentity POST and the redirect handoff a tenant login returns through. */
  function mintLaunchProof(customer, nonce) {
    const iat = nowSec();
    const token = signES256(privateKey, { alg: "ES256", typ: "JWT", kid }, {
      iss: issuer,
      aud: audience,
      sub: customer.id,
      tenant_id: tenantId,
      nonce,
      jti: crypto.randomUUID(),
      iat,
      exp: iat + 120,
    });
    return { token, nonce, expiresIn: 120 };
  }

  // In-memory demo sessions (ephemeral by design — this is a public demo,
  // not a real account system; restarting the container just signs everyone
  // out). Session id -> customer.
  const sessions = new Map();

  const TOOLS = tools;

  // ── Action cards ────────────────────────────────────────────────────────
  // A tool that needs structured details from a person declares a `formCard`,
  // and the host mounts it in the message instead of the assistant writing out
  // a list of things to type. The card is a `ui://` RESOURCE this server
  // serves; the mounted view calls this same tool back through the host.
  //
  // Served with the MCP Apps profile mime (`text/html;profile=mcp-app`) — the
  // host mounts only that profile; the OpenAI-style `text/html+skybridge` alias
  // never mounted live (Northline, 2026-09-11).
  // The builder is imported ONLY when a demo actually declares a card, so a
  // demo whose image does not ship `../ui/form-card.mjs` is unaffected.
  const hasCards = Object.values(TOOLS).some((tool) => tool.formCard);
  let CARDS = null;
  async function cards() {
    if (CARDS) return CARDS;
    CARDS = new Map();
    if (!hasCards) return CARDS;
    const { formCardHtml, formCardMeta, formCardUri } = await import("../ui/form-card.mjs");
    for (const [toolName, tool] of Object.entries(TOOLS)) {
      if (!tool.formCard) continue;
      CARDS.set(formCardUri(namespace, toolName), {
        toolName,
        uri: formCardUri(namespace, toolName),
        html: formCardHtml({ toolName, ...tool.formCard }),
        meta: formCardMeta(namespace, toolName),
      });
    }
    return CARDS;
  }
  async function cardMeta(toolName) {
    for (const card of (await cards()).values()) if (card.toolName === toolName) return card.meta;
    return undefined;
  }
  const advertised = Object.entries(TOOLS).filter(
    ([, t]) => delegationReady || t.accessHint !== "delegated",
  );
  const hidden = Object.keys(TOOLS).length - advertised.length;
  if (hidden > 0) {
    console.log(
      `[${storeName}] ${hidden} delegated tool(s) implemented but not advertised: `
      + "no actor-token verifier is installed (set ACTOR_VERIFIER_READY=1 once it is).",
    );
  }

  async function jsonRpcHandle(msg, authorization) {
    const { id, method, params } = msg || {};
    const reply = (result) => ({ jsonrpc: "2.0", id, result });
    const err = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
    if (method === "initialize") {
      return reply({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, ...(hasCards ? { resources: {} } : {}) },
        serverInfo: { name: `${storeName} MCP`, version: "1.0.0" },
      });
    }
    if (method === "tools/list") {
      const metas = new Map();
      for (const [name] of advertised) metas.set(name, await cardMeta(name));
      return reply({
        tools: advertised.map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
          // A reader decides whether to confirm from these, so publish them.
          annotations: { readOnlyHint: !!t.readOnlyHint, consequentialHint: !t.readOnlyHint },
          ...(metas.get(name) ? { _meta: metas.get(name) } : {}),
        })),
      });
    }
    if (method === "resources/list") {
      return reply({
        resources: [...(await cards()).entries()].map(([uri, card]) => ({
          uri,
          name: `${card.toolName} card`,
          description: `The action card for ${card.toolName}.`,
          mimeType: "text/html;profile=mcp-app",
        })),
      });
    }

    if (method === "resources/read") {
      const card = (await cards()).get(params?.uri);
      if (!card) return err(-32602, `unknown resource ${params?.uri}`);
      return reply({
        contents: [{ uri: params.uri, mimeType: "text/html;profile=mcp-app", text: card.html }],
      });
    }

    if (method === "tools/call") {
      const tool = TOOLS[params?.name];
      if (!tool) return err(-32601, `unknown tool ${params?.name}`);
      // A delegated tool answers for exactly one customer: the subject of the
      // actor token the platform signed. No verified bearer, no customer.
      let customerId = null;
      if (tool.accessHint === "delegated") {
        const actor = await verifyActorToken(authorization, { audience: issuer });
        if (!actor.ok) {
          return reply({
            // `error`/`reason` are for the assistant and the logs; `detail` is
            // the only string a visitor may end up reading, so it stays plain
            // language with no protocol words in it.
            content: [{ type: "text", text: JSON.stringify({
              error: "not_signed_in",
              reason: actor.reason,
              // Names no control: the platform renders the sign-in card from this
              // refusal, and a detail that pointed at one is what taught the
              // assistant to describe a header button instead (#2812).
              detail: `This one needs you signed in to ${storeName} — the card just below will do it.`,
            }) }],
            isError: true,
          });
        }
        customerId = actor.subject;
      }
      try {
        const out = await tool.handler(params?.arguments || {}, { customerId });
        return reply({
          content: [{ type: "text", text: JSON.stringify(out) }],
          isError: !!out?.error,
          // Carried on the RESULT as well as on `tools/list`, so a host mounts
          // the card around the answer and not only where the tool was offered.
          // (Removing this did NOT fix the dead turn it was suspected of — see
          // serebano/busymate-devtools#2787.)
          ...(await cardMeta(params?.name).then((m) => (m ? { _meta: m } : {}))),
        });
      } catch (e) {
        return err(-32000, e.message);
      }
    }
    return err(-32601, `unknown method ${method}`);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost`);
    res.setHeader("Cache-Control", "no-store");

    try {
      if (req.method === "GET" && url.pathname === "/healthz") {
        res.writeHead(200, { "Content-Type": "text/plain" }).end("ok\n");
        return;
      }

      if (req.method === "GET" && url.pathname === "/.well-known/jwks.json") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(jwks));
        return;
      }

      // The shapes of the last delegated calls: algorithm, whether a key id or
      // key-set hint was present, which checks passed. Never a token, a subject
      // or a claim value, so an operator can read it safely.
      if (req.method === "GET" && url.pathname === "/api/identity/actor-probe") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(
          JSON.stringify({ note: "shapes only - no token, subject or claim value is recorded", probes: actorProbe() })
        );
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/identity/session") {
        const sid = parseCookies(req).demo_session;
        const cust = sid && sessions.get(sid);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ signedIn: !!cust, customer: cust || null }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/identity/login") {
        const sid = crypto.randomUUID();
        sessions.set(sid, demoCustomer);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": SESSION_COOKIE(sid),
        }).end(JSON.stringify({ ok: true, customer: demoCustomer }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/identity/logout") {
        const sid = parseCookies(req).demo_session;
        if (sid) sessions.delete(sid);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": "demo_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
        }).end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/identity/mint") {
        const sid = parseCookies(req).demo_session;
        const customer = sid && sessions.get(sid);
        if (!customer) {
          res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not_signed_in" }));
          return;
        }
        let body = {};
        try {
          body = JSON.parse((await readBody(req)) || "{}");
        } catch {
          /* empty */
        }
        const nonce = body.nonce;
        if (!nonce || !NONCE_RE.test(nonce)) {
          res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad_nonce" }));
          return;
        }
        res.writeHead(201, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(
          JSON.stringify(mintLaunchProof(customer, nonce))
        );
        return;
      }

      if (url.pathname === "/mcp") {
        const body = await readBody(req);
        let msg;
        try {
          msg = JSON.parse(body || "{}");
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad_json" }));
          return;
        }
        const out = await jsonRpcHandle(msg, req.headers.authorization);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
        return;
      }

      if (routes) {
        const sid = parseCookies(req).demo_session;
        const handled = await routes(req, res, url, {
          customer: (sid && sessions.get(sid)) || null,
          demoCustomer,
          issuer,
          json: (status, body) =>
            res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body)),
          body: () => readBody(req),
          /** Start a demo session and return the Set-Cookie value for it. */
          signIn: () => {
            const fresh = crypto.randomUUID();
            sessions.set(fresh, demoCustomer);
            return SESSION_COOKIE(fresh);
          },
          /** A launch proof for the demo customer, for the redirect handoff. */
          mintLaunchProof: (nonce) => mintLaunchProof(demoCustomer, nonce),
          freshNonce: () => crypto.randomBytes(24).toString("base64url"),
          /** The tenant's hosted-assistant origins, for a demo's own override
           *  to build its OWN allowlist against (e.g. `[...ctx.hostedOrigins]`). */
          hostedOrigins,
          /** The EXACT `return_to`, resolved against this demo's own origin
           *  plus `hostedOrigins` — see the shared `resolveReturnTo` above. */
          resolveReturnTo: (requested) => resolveReturnTo(requested, issuer, hostedOrigins),
          /** The platform's nonce, echoed when well-formed; freshly minted only
           *  when none was supplied — see the shared `nonceOrFresh` above. */
          nonceOrFresh,
        });
        if (handled) return;
      }

      // Built-in tenant login the assistant can send a visitor to (the chat's
      // own "Sign in" button, driven by the identity provider's loginUrl): the
      // embed — OR the platform's hosted assistant page — navigates here with
      // `return_to` (+ the one-time `bmai_nonce` it minted), this demo has one
      // throwaway customer and no password, so it signs them straight in and
      // hands the proof back in the URL FRAGMENT — never the query string. The
      // EXACT `return_to` is honoured when its origin is this demo's own or a
      // declared `hostedOrigins` entry (resolveReturnTo, above) — anything else
      // is ignored, not followed — and the supplied nonce is ECHOED, never
      // re-minted, or every hosted-page sign-in binds a token the platform
      // then correctly refuses (#2865). A demo's own `routes` may override this
      // path (they run first).
      if (url.pathname === "/api/identity/start") {
        const requested = url.searchParams.get("return_to") || "/";
        const destination = resolveReturnTo(requested, issuer, hostedOrigins);
        const fresh = crypto.randomUUID();
        sessions.set(fresh, demoCustomer);
        const proof = mintLaunchProof(demoCustomer, nonceOrFresh(url.searchParams.get("bmai_nonce")));
        destination.hash = new URLSearchParams({ bmai_token: proof.token, bmai_nonce: proof.nonce }).toString();
        res.writeHead(303, {
          Location: destination.href,
          "Set-Cookie": SESSION_COOKIE(fresh),
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        }).end();
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not_found" }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "internal", message: e.message }));
    }
  });

  server.listen(port, () => console.log(`[${storeName}] mcp-identity-server listening on :${port}`));
  return server;
}
