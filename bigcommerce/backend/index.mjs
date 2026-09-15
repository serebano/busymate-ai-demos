// sites/bigcommerce/backend/index.mjs
//
// Copperfield Kitchen Co.'s own MCP server + self-hosted identity.
//
// BigCommerce is a hosted SaaS — there is no plugin to own identity the way
// sites/woo/backend does, so this backend is self-hosted end to end, the
// same shape as sites/shopify/backend: the shared mcp-identity-server.mjs
// generates its own ES256 keypair, serves the JWKS, and signs a launch proof
// for ONE fixed, documented demo customer (never a real person) — Daniel
// Weber, whose real BigCommerce order #101 (created by the seeding pass,
// billing email daniel.weber@example.com) is what "signed in" actually
// unlocks. Everything the delegated tools answer is a LIVE read of that
// order via sites/bigcommerce/backend/bigcommerce.mjs — nothing here is
// hardcoded demo data.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { apiReady } from "./bigcommerce.mjs";
import { serveWellKnown } from "./wellKnown.mjs";

const ORIGIN = process.env.BC_DEMO_ORIGIN ?? "https://bigcommerce.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID ?? "";

const tools = apiReady
  ? TOOL_TABLE
  : Object.fromEntries(Object.entries(TOOL_TABLE).filter(([, t]) => t.accessHint !== "delegated"));
if (!apiReady) {
  console.error("[copperfield] BC_STORE_HASH/BC_ACCESS_TOKEN/BC_CLIENT_ID absent — the order tools are NOT advertised.");
}

// Delegation is READY only when this process holds everything the platform's
// actor-token verifier needs (same derivation as sites/woo/backend/index.mjs).
const delegationReady = Boolean(
  process.env.BMAI_SUPPORT_ACTOR_SECRET
  && process.env.BMAI_SUPPORT_TENANT_ID
  && process.env.BMAI_SUPPORT_CONNECTOR_ID
  && (process.env.BMAI_SUPPORT_AUDIENCE || ORIGIN),
);
if (!delegationReady) {
  console.error("[copperfield] no actor verifier installed — the delegated tools are NOT advertised.");
}

start({
  delegationReady,
  port: Number(process.env.PORT ?? 8110),
  issuer: ORIGIN,
  tenantId: TENANT_ID,
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "Copperfield Kitchen Co.",
  namespace: "copperfield",
  // The store's own real customer, identified by the email on the real
  // order #101 seeded via the Admin API. `id` doubles as the email the
  // order-book reader filters on — see sites/bigcommerce/backend/tools.mjs.
  demoCustomer: {
    id: process.env.DEMO_CUSTOMER_EMAIL ?? "daniel.weber@example.com",
    name: "Daniel Weber",
    email: process.env.DEMO_CUSTOMER_EMAIL ?? "daniel.weber@example.com",
  },
  tools,
  hostedOrigins: [
    `https://${process.env.TENANT_SLUG ?? "demo-bigcommerce"}.busymate.ai`,
    "https://busymate.ai",
    ORIGIN,
    process.env.BC_SITE_ORIGIN ?? "https://12zero784.mybigcommerce.com",
  ],
  routes: serveWellKnown,
});
