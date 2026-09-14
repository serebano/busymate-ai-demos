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
  // the real checker's `details.url` is the bare path) — the REAL
  // agents.json v0.1.0 schema (wild-card-ai/agents-json, fetched verbatim
  // via `gh api repos/wild-card-ai/agents-json/contents/…schema.json` —
  // never guessed): top-level agentsJson/info/sources[]/flows[]. Every
  // `sources[]` entry needs {id, path} (path = a URL to an OpenAPI 3+
  // spec — our real openapi.json). Every `flows[]` entry needs
  // {id, title, description, actions[], fields}: one `actions[]` entry per
  // flow ({id, sourceId, operationId} — operationId is the ONE real
  // operation openapi.json documents, since our whole surface is one
  // JSON-RPC endpoint), and `fields.parameters[]` derived from the tool's
  // OWN inputSchema properties (never invented) plus `fields.responses.success`.
  // A WebMCP-only tool (no MCP backend) has no OpenAPI source to point at,
  // so it gets no flow here — it is not a fabricated API action.
  // Busymate's OWN bespoke discovery card (name/url/tools/identity/
  // human-hand-off — no external scanner checks it) lives at
  // `.well-known/agents.json` instead — see gen-agent-files.mjs.
  const jsonSchemaTypeOf = (prop) => (prop && typeof prop === "object" ? prop.type : undefined);
  const agentsJsonV01 = {
    agentsJson: "0.1.0",
    info: { title: config.name, description: config.description, version: "1.0.0" },
    sources: hasMcp ? [{ id: "mcp", path: `${config.siteUrl}/openapi.json` }] : [],
    flows: Object.entries(allTools)
      .filter(([, t]) => t.transport !== "webmcp")
      .map(([n, t]) => {
        const props = (t.inputSchema && t.inputSchema.properties) || {};
        const required = new Set((t.inputSchema && t.inputSchema.required) || []);
        return {
          id: n,
          title: n.replace(/_/g, " "),
          description: t.description,
          actions: [{ id: "call", sourceId: "mcp", operationId: "mcpJsonRpcCall" }],
          fields: {
            parameters: Object.entries(props).map(([pname, pdef]) => ({
              name: pname,
              ...(pdef && pdef.description ? { description: pdef.description } : {}),
              required: required.has(pname),
              ...(jsonSchemaTypeOf(pdef) ? { type: jsonSchemaTypeOf(pdef) } : {}),
            })),
            responses: {
              success: { type: "object", description: "The JSON-RPC 2.0 tools/call result for this tool." },
            },
          },
        };
      }),
  };
  fs.writeFileSync(path.join(config.outDir, "agents.json"), `${JSON.stringify(agentsJsonV01, null, 2)}\n`);

  // ---- C7: agent-permissions.json — the REAL las-wg/agent-permissions.json
  // v1.0.0 schema (fetched verbatim via `gh api
  // repos/las-wg/agent-permissions.json/contents/README.md` — its only
  // top-level keys are metadata/strict/resource_rules/action_guidelines/api,
  // additionalProperties:false, so a per-tool "tools" map — this repo's
  // first draft — fails validation outright). `resource_rules` states
  // what's genuinely true of every page here (reading is always allowed);
  // `api` points at the real MCP + OpenAPI endpoints, honestly preferring
  // them over page interaction; `action_guidelines` are derived straight
  // from confirmHint/accessHint — never invented ones.
  const mutating = Object.entries(allTools).filter(([, t]) => t.confirmHint);
  const identified = Object.entries(allTools).filter(([, t]) => t.accessHint === "identified" || t.accessHint === "delegated");
  const permissions = {
    metadata: { schema_version: "1.0.0", last_updated: `${today}T00:00:00Z` },
    strict: true,
    resource_rules: [
      { verb: "read_content", selector: "*", allowed: true },
      { verb: "read_metadata", selector: "*", allowed: true },
      { verb: "follow_link", selector: "*", allowed: true },
    ],
    ...(hasMcp ? {
      api: [
        {
          type: "mcp",
          endpoint: config.mcpUrl,
          docs: `${config.siteUrl}/.well-known/mcp.json`,
          description: "This site's MCP server — prefer calling its tools over simulating page interactions.",
        },
        {
          type: "openapi",
          endpoint: `${config.siteUrl}/openapi.json`,
          description: "The same tools, documented as a REST-style OpenAPI spec.",
        },
      ],
    } : {}),
    action_guidelines: [
      { directive: "SHOULD", description: "Prefer this site's MCP/WebMCP tools over simulating clicks or form fills on the page." },
      { directive: "MUST NOT", description: "Treat any action on this demo as touching a real order, payment or person — this is a sandbox." },
      ...(mutating.length ? [{
        directive: "MUST",
        description: `Confirm with the visitor before calling a mutating tool (${mutating.map(([n]) => n).join(", ")}) — each one changes something.`,
      }] : []),
      ...(identified.length ? [{
        directive: "SHOULD",
        description: `Expect an identified-visitor tool (${identified.map(([n]) => n).join(", ")}) to require a signed launch proof and answer for that visitor alone.`,
      }] : []),
    ],
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
