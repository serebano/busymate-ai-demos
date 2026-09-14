// sites/woo/backend/routes.mjs
//
// The one HTTP route this container serves besides /mcp.
//
// `GET /api/bmai/status` is the platform's READINESS PROBE for a connector in
// `signed_actor_token` mode: choosing the mode is only intent, and the control
// plane refuses to persist it until this origin says, in its own words, that a
// delegated bearer will actually be accepted. So the answer is computed, never
// declared — `actorVerifier` is true only when this process holds the four
// values its verifier needs, and `identity` only when the store's own key set
// is really being served.
//
// It returns no secret and no customer: three booleans, a TTL and the names of
// the tools the mode unlocks.
import { orderBookReady } from "./woo.mjs";

const ORIGIN = process.env.WOO_ORIGIN ?? "https://woo.demo.busymate.ai";
const JWKS_URL = `${ORIGIN}/.well-known/jwks.json`;
const DELEGATED_TOOLS = ["list_my_orders", "get_order_status", "start_return"];

const actorVerifierConfigured = () => Boolean(
  process.env.BMAI_SUPPORT_ACTOR_SECRET
  && process.env.BMAI_SUPPORT_TENANT_ID
  && process.env.BMAI_SUPPORT_CONNECTOR_ID
  && (process.env.BMAI_SUPPORT_AUDIENCE || ORIGIN),
);

/** Is the store really publishing a usable key set right now? Cached briefly. */
let identityCache = { at: 0, ok: false };
async function identityConfigured() {
  if (Date.now() - identityCache.at < 60_000) return identityCache.ok;
  let ok = false;
  try {
    const res = await fetch(JWKS_URL, { headers: { accept: "application/json" } });
    const body = res.ok ? await res.json() : null;
    ok = Array.isArray(body?.keys) && body.keys.length > 0;
  } catch {
    ok = false;
  }
  identityCache = { at: Date.now(), ok };
  return ok;
}

/**
 * @type {import("./_shared/mcp-identity-server.mjs").start}
 */
export async function routes(req, res, url, ctx) {
  if (url.pathname !== "/api/bmai/status") return false;
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, OPTIONS",
    }).end();
    return true;
  }
  if (req.method !== "GET") {
    ctx.json(405, { error: "method_not_allowed" });
    return true;
  }
  const body = {
    identity: await identityConfigured(),
    actorVerifier: actorVerifierConfigured(),
    launchTtlSec: 120,
    tools: actorVerifierConfigured() && orderBookReady ? DELEGATED_TOOLS : [],
    // Where the two halves actually live, so an operator reading this probe is
    // not left guessing which process owns identity on this demo.
    identityEndpoint: `${ORIGIN}/wp-json/busymate/v1/launch`,
    jwksUri: JWKS_URL,
  };
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  }).end(JSON.stringify(body));
  return true;
}
