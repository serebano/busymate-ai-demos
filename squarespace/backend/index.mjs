// sites/squarespace/backend/index.mjs
//
// Quiet Pines Yoga's own MCP server + self-hosted identity.
//
// Squarespace is a hosted SaaS — there is no plugin to own identity the way
// sites/woo/backend does, so this backend is self-hosted end to end, the
// same shape as sites/bigcommerce/backend: the shared
// mcp-identity-server.mjs generates its own ES256 keypair, serves the JWKS,
// and signs a launch proof for ONE fixed, documented demo visitor — never a
// real person. Everything the tools answer is a LIVE read of the real
// Squarespace trial site via sites/squarespace/backend/squarespace.mjs —
// nothing here is hardcoded demo data.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { apiReady } from "./squarespace.mjs";
import { serveWellKnown } from "./wellKnown.mjs";

const ORIGIN = process.env.SQSP_DEMO_ORIGIN ?? "https://squarespace.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID ?? "";

const tools = apiReady
  ? TOOL_TABLE
  : Object.fromEntries(Object.entries(TOOL_TABLE).filter(([, t]) => t.accessHint !== "delegated"));
if (!apiReady) {
  console.error("[quiet-pines] SQSP_SITE_ORIGIN absent — the site tools are NOT advertised.");
}

// Delegation is READY only when this process holds everything the platform's
// actor-token verifier needs (same derivation as sites/bigcommerce/backend/index.mjs).
const delegationReady = Boolean(
  process.env.BMAI_SUPPORT_ACTOR_SECRET
  && process.env.BMAI_SUPPORT_TENANT_ID
  && process.env.BMAI_SUPPORT_CONNECTOR_ID
  && (process.env.BMAI_SUPPORT_AUDIENCE || ORIGIN),
);
if (!delegationReady) {
  console.error("[quiet-pines] no actor verifier installed — the delegated tools are NOT advertised.");
}

start({
  delegationReady,
  port: Number(process.env.PORT ?? 8111),
  issuer: ORIGIN,
  tenantId: TENANT_ID,
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "Quiet Pines Yoga",
  namespace: "quiet-pines",
  // A provided demo visitor — never a real person.
  demoCustomer: {
    id: process.env.DEMO_CUSTOMER_EMAIL ?? "sasha.moreau@example.com",
    name: "Sasha Moreau",
    email: process.env.DEMO_CUSTOMER_EMAIL ?? "sasha.moreau@example.com",
  },
  tools,
  hostedOrigins: [
    `https://${process.env.TENANT_SLUG ?? "demo-squarespace"}.busymate.ai`,
    "https://busymate.ai",
    ORIGIN,
    process.env.SQSP_SITE_ORIGIN ?? "https://bat-vanilla-s2x4.squarespace.com",
  ],
  routes: serveWellKnown,
});
