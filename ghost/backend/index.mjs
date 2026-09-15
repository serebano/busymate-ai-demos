// sites/ghost/backend/index.mjs
//
// The Meridian Line's backend: the tenant identity provider (mints the ES256
// launch proof for the one real Ghost Member created during provisioning,
// `demoCustomer` in store.mjs), its own MCP server, and — since
// busymate-devtools#3027 — this demo's agent-ready layer (llms.txt,
// agents.json, same-URL Markdown negotiation; see agent-ready.mjs), routed
// here by infra/nginx/ghost-https.conf.template because Ghost's own router
// has no route for any of it.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { demoCustomer, CONTACT } from "./store.mjs";
import { agentReadyRoutes } from "./agent-ready.mjs";

const ISSUER = process.env.ISSUER ?? "https://ghost.demo.busymate.ai";

start({
  port: Number(process.env.PORT ?? 8117),
  issuer: ISSUER,
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "The Meridian Line",
  demoCustomer,
  tools: TOOL_TABLE,
  routes: agentReadyRoutes({
    issuer: ISSUER,
    mcpUrl: `${ISSUER}/mcp`,
    storeName: "The Meridian Line",
    tagline: "An independent magazine about makers, small manufacturing and local economies.",
    contactEmail: CONTACT.email,
  }),
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>.
  // This tenant's slug is "meridian" (sites/ghost/demo.json `assistant`).
  hostedOrigins: ["https://meridian.busymate.ai", "https://busymate.ai", "https://ghost.demo.busymate.ai"],
});
