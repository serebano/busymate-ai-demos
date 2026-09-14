#!/usr/bin/env node
// sites/_shared/gen-protocol-files.mjs
//
// The protocol-discovery layer every demo serves at /openapi.json and under
// /.well-known/: a REAL OpenAPI document, an MCP Server Card (SEP-2127), an
// agents.json v0.1.0 "tool actions" manifest (agentsjson.org — a DIFFERENT
// shape than the bespoke discovery card gen-agent-files.mjs writes at the
// bare /agents.json path: that collision is why this one lives only under
// /.well-known/), agent-permissions.json, and the RFC 9727 api-catalog —
// every one of them derived from the SAME resolved tool table
// gen-agent-files.mjs uses (`resolveTools`), so none of this can advertise a
// tool the live MCP server does not actually serve (#2905).
//
// A protocol this repo does NOT implement (A2A, UCP, OAuth AS/PRM metadata,
// the web-bot-auth key directory, Agent Skills discovery, ACP) is never
// faked here: it gets a clean, honest JSON 404 at the nginx layer instead
// (see the "protocol discovery" block in infra/nginx/*.conf.template) — this
// generator only ever writes what the demo genuinely serves.
//
// Usage: node sites/_shared/gen-protocol-files.mjs <path-to-demo-config.mjs>
// (the SAME config module gen-agent-files.mjs takes — no per-demo authoring
// needed beyond what already exists for llms.txt/agents.json).
import fs from "node:fs";
import path from "node:path";
import { resolveTools } from "./gen-agent-files.mjs";

// A tool's inputSchema is already plain JSON Schema (type/properties/
// required/additionalProperties/description/enum/items…) — every one of
// those keywords is also a valid OpenAPI 3.0 Schema Object field, so this is
// a pass-through, never a re-authored shape that could drift from the real
// tool definition.
function toOpenApiSchema(schema) {
  return schema && typeof schema === "object" ? schema : { type: "object" };
}

/** @param {import("./gen-agent-files.mjs").AgentFilesConfig} config */
export function generate(config) {
  const { hasMcp, allTools } = resolveTools(config);
  const today = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(config.outDir, { recursive: true });
  const wellKnown = path.join(config.outDir, ".well-known");
  fs.mkdirSync(wellKnown, { recursive: true });

  // ---- S15: /openapi.json — a REAL, valid OpenAPI 3.0 document for the one
  // HTTP surface this demo's tools actually go over: JSON-RPC 2.0 POST /mcp.
  // Every tool is documented as a components schema (named `<tool>Args`),
  // referenced from the one real operation's description — never a
  // fabricated `/api/tools/<name>` REST path this demo does not serve.
  const toolSchemas = Object.fromEntries(
    Object.entries(allTools).map(([n, t]) => [
      `${n}Args`,
      { description: t.description, ...toOpenApiSchema(t.inputSchema) },
    ]),
  );
  const openapi = {
    openapi: "3.0.3",
    info: {
      title: `${config.name} — MCP tools API`,
      description: config.description,
      version: "1.0.0",
    },
    servers: [{ url: config.siteUrl }],
    paths: hasMcp
      ? {
        "/mcp": {
          post: {
            operationId: "mcpJsonRpcCall",
            summary: "Invoke this demo's MCP tools over JSON-RPC 2.0",
            description:
              "Every tool below is called the same way: POST a JSON-RPC 2.0 envelope with "
              + '`method: "tools/call"` and `params: {name, arguments}`, where `name` is one of '
              + `${Object.keys(allTools).join(", ")} and \`arguments\` matches that tool's `
              + '`<name>Args` schema under `components.schemas`. `method: "tools/list"` returns the '
              + 'live catalogue; `method: "initialize"` starts the session.',
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["jsonrpc", "method"],
                    properties: {
                      jsonrpc: { type: "string", enum: ["2.0"] },
                      id: { description: "Request id, echoed on the response." },
                      method: {
                        type: "string",
                        enum: ["initialize", "tools/list", "tools/call", "resources/list", "resources/read"],
                      },
                      params: {
                        type: "object",
                        description: "For tools/call: { name: <tool name>, arguments: <that tool's Args schema> }.",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "JSON-RPC 2.0 response: {jsonrpc, id, result} or {jsonrpc, id, error}.",
                content: { "application/json": { schema: { type: "object" } } },
              },
            },
          },
        },
      }
      : {},
    components: { schemas: toolSchemas },
  };
  fs.writeFileSync(path.join(config.outDir, "openapi.json"), `${JSON.stringify(openapi, null, 2)}\n`);

  // ---- C1: MCP Server Card (SEP-2127 draft) at /.well-known/mcp.json — the
  // identity + remote-transport facts for the SAME server /mcp serves. The
  // spec keeps tool/resource/prompt listings OUT of the card on purpose
  // (those stay live-only, via tools/list) — this never restates them.
  if (hasMcp) {
    const mcpCard = {
      $schema: "https://static.modelcontextprotocol.io/schemas/2026-06-18/server-card.schema.json",
      name: `${config.name} MCP server`,
      version: "1.0.0",
      title: config.name,
      description: config.description,
      websiteUrl: config.siteUrl,
      remotes: [{ type: "streamable-http", url: config.mcpUrl }],
    };
    fs.writeFileSync(path.join(wellKnown, "mcp.json"), `${JSON.stringify(mcpCard, null, 2)}\n`);
  }

  // ---- C6: /agents.json (BARE path — verified 2026-09-14 against a live
  // agent-ready.dev rescan; the original ticket assumed .well-known/, but
  // the real checker's `details.url` is the bare path) — the agents.json
  // v0.1.0 "tool actions" schema (agentsjson.org / Wildcard): top-level
  // agentsJson/info/sources/flows, every flow's operations naming a REAL
  // openapi.json operationId. Our whole surface is one JSON-RPC endpoint,
  // so every MCP-backed flow shares the one real operationId and carries
  // which tool/arguments to send as extension fields (`x-*`) rather than
  // inventing per-tool REST routes. A WebMCP-only tool (no MCP backend) has
  // no OpenAPI operation to point at, so its flow's `operations` stays
  // empty — never a fabricated one. Busymate's OWN bespoke discovery card
  // (name/url/tools/identity/human-hand-off — no external scanner checks
  // it) lives at `.well-known/agents.json` instead — see gen-agent-files.mjs.
  const agentsJsonV01 = {
    agentsJson: "0.1.0",
    info: { title: config.name, description: config.description, version: "1.0.0" },
    sources: hasMcp ? [{ id: "mcp", type: "openapi", url: `${config.siteUrl}/openapi.json` }] : [],
    flows: Object.entries(allTools).map(([n, t]) => ({
      id: n,
      title: n.replace(/_/g, " "),
      description: t.description,
      operations: t.transport === "webmcp" ? [] : ["mcpJsonRpcCall"],
      "x-mcpTool": n,
      "x-transport": t.transport,
      "x-readOnly": !!t.readOnlyHint,
      ...(t.accessHint ? { "x-access": t.accessHint } : {}),
    })),
  };
  fs.writeFileSync(path.join(config.outDir, "agents.json"), `${JSON.stringify(agentsJsonV01, null, 2)}\n`);

  // ---- C7: agent-permissions.json — one row per tool, derived straight
  // from the SAME readOnlyHint/accessHint/confirmHint this repo's real
  // dispatcher (mcp-identity-server.mjs) already gates on. strict:true
  // states plainly what that dispatcher already does: a tool NOT listed
  // here does not exist as far as this server is concerned (unknown method
  // -> JSON-RPC -32601), so an agent must not assume undeclared access.
  // Served at BOTH the bare path (what the live checker's `details.url`
  // actually reads, verified 2026-09-14) and the well-known path (the
  // convention the original ticket named) — same bytes, no reason to pick.
  const permissions = {
    metadata: { schema_version: "1.0.0", last_updated: today },
    strict: true,
    tools: Object.fromEntries(Object.entries(allTools).map(([n, t]) => [n, {
      access: t.accessHint === "identified" || t.accessHint === "delegated" ? "identified" : "public",
      readOnly: !!t.readOnlyHint,
      requiresConfirmation: !!t.confirmHint,
      transport: t.transport,
    }])),
  };
  const permissionsText = `${JSON.stringify(permissions, null, 2)}\n`;
  fs.writeFileSync(path.join(config.outDir, "agent-permissions.json"), permissionsText);
  fs.writeFileSync(path.join(wellKnown, "agent-permissions.json"), permissionsText);

  // ---- C13: /.well-known/api-catalog (RFC 9727) — cheap and real once
  // openapi.json is real: one linkset entry pointing at it.
  const apiCatalog = {
    linkset: [{ anchor: `${config.siteUrl}/`, "service-desc": [{ href: `${config.siteUrl}/openapi.json` }] }],
  };
  fs.writeFileSync(path.join(wellKnown, "api-catalog"), `${JSON.stringify(apiCatalog, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("usage: node gen-protocol-files.mjs <config.mjs>");
    process.exit(1);
  }
  const mod = await import(path.resolve(configPath));
  generate(mod.default);
  console.log(
    `wrote openapi.json, .well-known/{mcp,agents,agent-permissions}.json, .well-known/api-catalog -> ${mod.default.outDir}`,
  );
}
