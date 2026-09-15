// sites/webflow/backend/index.mjs
//
// Aldercroft Studio's backend: the tenant identity provider (mints the ES256
// launch proof for the one demo client account, `demoCustomer` in
// store.mjs — Webflow Memberships is a paid-plan feature, unavailable on
// Starter) and this demo's own MCP server. No custom routes for identity —
// the shared server's built-in /api/identity/* covers the whole sign-in
// flow, same shape as ghost/scan/web. `routes` IS used here for one thing
// the shared server has no opinion on: the six-layer agent-ready files,
// which Webflow's Starter plan cannot serve as custom paths on its own
// hosting (see wellKnown.mjs).
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { demoCustomer } from "./store.mjs";
import { serveWellKnown } from "./wellKnown.mjs";

start({
  port: Number(process.env.PORT ?? 8118),
  issuer: process.env.ISSUER ?? "https://webflow.demo.busymate.ai",
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "Aldercroft Studio",
  demoCustomer,
  tools: TOOL_TABLE,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>.
  // The REAL demo site is aldercroft-studio.webflow.io, an entirely separate
  // origin this backend doesn't serve — see sites/webflow/demo.json.
  hostedOrigins: [
    "https://aldercroft-studio.busymate.ai",
    "https://busymate.ai",
    "https://webflow.demo.busymate.ai",
    "https://aldercroft-studio.webflow.io",
  ],
  routes: serveWellKnown,
});
