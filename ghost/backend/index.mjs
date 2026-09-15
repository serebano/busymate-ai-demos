// sites/ghost/backend/index.mjs
//
// The Meridian Line's backend: the tenant identity provider (mints the ES256
// launch proof for the one real Ghost Member created during provisioning,
// `demoCustomer` in store.mjs) and its own MCP server. No custom routes —
// the shared server's built-in /api/identity/* covers the whole sign-in
// flow, same shape as scan/web/slack.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { demoCustomer } from "./store.mjs";

start({
  port: Number(process.env.PORT ?? 8117),
  issuer: process.env.ISSUER ?? "https://ghost.demo.busymate.ai",
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "The Meridian Line",
  demoCustomer,
  tools: TOOL_TABLE,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>.
  // This tenant's slug is "meridian" (sites/ghost/demo.json `assistant`).
  hostedOrigins: ["https://meridian.busymate.ai", "https://busymate.ai", "https://ghost.demo.busymate.ai"],
});
