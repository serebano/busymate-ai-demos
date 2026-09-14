// sites/web/backend/index.mjs
//
// Northwind Coffee's backend: the identity provider that signs who is asking,
// the store's own MCP server, and the storefront API the page tools read.
// Everything generic lives in sites/_shared/backend/; this file is only the
// coffee shop.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { routes } from "./routes.mjs";
import { demoCustomer } from "./store.mjs";

start({
  port: Number(process.env.PORT ?? 8781),
  issuer: process.env.ISSUER ?? "https://web.demo.busymate.ai",
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "Northwind Coffee",
  demoCustomer: {
    id: demoCustomer.id,
    name: demoCustomer.name,
    email: demoCustomer.email,
    since: demoCustomer.since,
    subscription: demoCustomer.subscription,
  },
  tools: TOOL_TABLE,
  routes,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST, so a cold return there still lands in
  // this workspace's assistant) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demos" (sites/web/demo.json `assistant`).
  hostedOrigins: ["https://demos.busymate.ai", "https://busymate.ai"],
  // Agent-discovery convention puts the manifest under /.well-known/ too.
  wellKnownFiles: { "agents.json": new URL("./agents.json", import.meta.url).pathname },
});
