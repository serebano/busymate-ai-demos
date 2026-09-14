// sites/woo/backend/index.mjs
//
// Fernweh Supply Co.'s own MCP server.
//
// It is NOT this demo's identity provider — the store is a real WordPress
// install and the Busymate AI plugin on it owns identity: the ES256 keypair,
// `/.well-known/jwks.json` and the `/wp-json/busymate/v1/launch` mint all live
// in WordPress, and nginx routes those paths to the WordPress container. This
// process therefore serves two public paths and nginx routes only those two
// here: `/mcp`, and `/api/bmai/status` — the readiness probe the platform
// insists on before it will persist a `signed_actor_token` connector.
//
// The shared server is reused as-is (it carries the JSON-RPC dispatcher, the
// action-card resources and the delegated-actor gate). Its own identity routes
// are simply never reachable: nginx does not forward them, and `KEY_DIR` is a
// throwaway directory inside the container so the keypair it insists on
// generating is used by nothing and published nowhere.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { routes } from "./routes.mjs";
import { orderBookReady } from "./woo.mjs";

const ORIGIN = process.env.WOO_ORIGIN ?? "https://woo.demo.busymate.ai";

// Fail loudly rather than silently offering an order tool that can only ever
// throw: without the store's REST key the three delegated tools are removed
// from the table before the server ever advertises them.
const tools = orderBookReady
  ? TOOL_TABLE
  : Object.fromEntries(Object.entries(TOOL_TABLE).filter(([, t]) => t.accessHint !== "delegated"));
if (!orderBookReady) {
  console.error("[fernweh] WC_CONSUMER_KEY/SECRET absent — the order tools are NOT advertised.");
}

// Delegation is READY only when this process holds everything the verifier
// needs: the tenant-set HS256 secret, the tenant and connector it is scoped to,
// and the audience the platform stamps. Derived rather than declared, so a
// container missing one of them hides the three delegated tools instead of
// advertising a capability that can only refuse.
const delegationReady = Boolean(
  process.env.BMAI_SUPPORT_ACTOR_SECRET
  && process.env.BMAI_SUPPORT_TENANT_ID
  && process.env.BMAI_SUPPORT_CONNECTOR_ID
  && (process.env.BMAI_SUPPORT_AUDIENCE || ORIGIN),
);
if (!delegationReady) {
  console.error("[fernweh] no actor verifier installed — the delegated tools are NOT advertised.");
}

start({
  delegationReady,
  port: Number(process.env.PORT ?? 8107),
  issuer: ORIGIN,
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/tmp/unused-keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/tmp/unused-wellknown",
  storeName: "Fernweh Supply Co.",
  namespace: "fernweh",
  // The store's own customer. Used only to name who a delegated answer is
  // about; the id that actually scopes a read comes from the signed actor
  // token, never from here.
  demoCustomer: {
    id: process.env.DEMO_CUSTOMER_ID ?? "2",
    name: "Mara Oertel",
    email: "demo@woo.demo.busymate.ai",
  },
  tools,
  routes,
});
