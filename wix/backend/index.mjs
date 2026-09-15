// sites/wix/backend/index.mjs
//
// Wren & Oat Bakery's backend: the tenant identity provider (mints the
// ES256 launch proof for the one demo customer account, `demoCustomer` in
// store.mjs — Wix Members Area sign-in isn't reachable from a plain
// server-side backend) and this demo's own MCP server. No custom routes
// for identity — the shared server's built-in /api/identity/* covers the
// whole sign-in flow, same shape as ghost/webflow/scan/web. `routes` IS
// used here for one thing the shared server has no opinion on: the
// six-layer agent-ready files, which Wix's free plan cannot serve as
// custom paths on its own hosting (see wellKnown.mjs).
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { demoCustomer } from "./store.mjs";
import { serveWellKnown } from "./wellKnown.mjs";

start({
  port: Number(process.env.PORT ?? 8119),
  issuer: process.env.ISSUER ?? "https://wix.demo.busymate.ai",
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "Wren & Oat Bakery",
  demoCustomer,
  tools: TOOL_TABLE,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>.
  // The REAL demo site is mrserebano.wixsite.com/wren-and-oat, an entirely
  // separate origin this backend doesn't serve — see sites/wix/demo.json.
  hostedOrigins: [
    "https://wren-and-oat.busymate.ai",
    "https://busymate.ai",
    "https://wix.demo.busymate.ai",
    "https://mrserebano.wixsite.com",
  ],
  routes: serveWellKnown,
});
