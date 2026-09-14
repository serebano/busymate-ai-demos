// sites/scan/backend/index.mjs
//
// Beacon's backend: the identity provider (a demo visitor + a scan-history
// memory, not a customer account) and Beacon's own MCP server. No custom
// routes — the shared server's built-in /api/identity/* covers the whole
// sign-in flow, and Beacon has no catalogue of its own to serve.
import { start } from "./_shared/mcp-identity-server.mjs";
import { TOOL_TABLE } from "./tools.mjs";
import { demoCustomer } from "./store.mjs";

start({
  port: Number(process.env.PORT ?? 8104),
  issuer: process.env.ISSUER ?? "https://scan.demo.busymate.ai",
  tenantId: process.env.TENANT_ID ?? "",
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  storeName: "Beacon",
  demoCustomer,
  tools: TOOL_TABLE,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demo-scan" (sites/scan/demo.json `assistant`).
  hostedOrigins: ["https://demo-scan.busymate.ai", "https://busymate.ai"],
  // NOTE (#2905/C6): a stale `wellKnownFiles: { "agents.json": ... }` here
  // used to copy this backend's baked-in bare card OVER the real, freshly
  // rsynced /.well-known/agents.json (now a DIFFERENT document — the
  // agentsJson v0.1.0 manifest, not the bare card) on every container boot.
  // Removed: the well-known file is static content now, never something a
  // backend needs to publish itself.
});
