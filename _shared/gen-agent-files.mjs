#!/usr/bin/env node
// sites/_shared/gen-agent-files.mjs
//
// Shared generator for a "full-feature" demo's three agent-discovery
// artifacts: /llms.txt (+ a byte-identical /llms.txt.md twin per the
// llms.txt convention of shipping both extensions) and /agents.json. Tool
// descriptions come from sites/_shared/backend/tool-schema.mjs — the SAME
// source the live MCP server (`/mcp`) uses — so these static files can
// never drift from what the server actually exposes.
//
// Usage: node sites/_shared/gen-agent-files.mjs <path-to-demo-config.mjs>
// The config module's default export is documented in JSDoc below; it
// writes llms.txt / llms.txt.md / agents.json into `config.outDir`.
import fs from "node:fs";
import path from "node:path";
import { toolsFor } from "./backend/tool-schema.mjs";

/**
 * @typedef {object} AgentFilesConfig
 * @property {string} siteUrl        e.g. https://shopify.demo.busymate.ai
 * @property {string} name           e.g. "Northline Outdoor"
 * @property {string} description   one paragraph, plain text
 * @property {string} outDir         where to write the three files (the demo's public/ dir)
 * @property {string} [mcpUrl]       e.g. https://shopify.demo.busymate.ai/mcp — OMIT for a
 *   demo with no MCP backend (a presentation-only page, e.g. the site-scan demo): the
 *   generator then skips the "Act on it (agents)" MCP section, reports `mcp: null` in
 *   agents.json, and never claims identity support it does not have (see identityDocsUrl).
 * @property {{title:string,url:string,note?:string,md?:string}[]} pages
 *   key pages to list. `note` is the one-line description the llms.txt
 *   convention expects after each link; `md` is that page's Markdown twin.
 * @property {{title:string,url:string}[]} docs   "how to add this to your site" links
 * @property {string} [identityDocsUrl]  omit for a demo with NO identified-visitor experience —
 *   agents.json then reports `identity.supported:false` instead of a blanket `true`.
 * @property {string} [identityDemoNote]  one extra sentence appended after identityDocsUrl's
 *   line in llms.txt (e.g. "A demo customer is provided on the page, so the identified
 *   experience can be tested without a real account.").
 * @property {Record<string, {description:string, inputSchema:object, readOnlyHint?:boolean, accessHint?:string, confirmHint?:boolean}>} [mcpTools]
 *   your resolved MCP tool table (name -> schema, no handlers needed here).
 *   Defaults to tool-schema.mjs's generic retail set via `toolsFor(config.name)` only when
 *   `mcpUrl` IS set and this is omitted; with no `mcpUrl` it defaults to `{}` instead —
 *   pass your own when your store's tools are shaped differently (e.g.
 *   `search_coffee`/`list_my_orders`/delegated access).
 * @property {Record<string, {description:string, inputSchema:object, readOnlyHint?:boolean}>} [webmcpOnlyTools]
 *   page-only tools (cart, etc.) that exist via WebMCP but are NOT on the MCP server. For an
 *   MCP-less demo these are the ONLY tools — every one is WebMCP-only by definition.
 * @property {string[]} [alsoWebmcp]
 *   names from `mcpTools` that the PAGE also registers as WebMCP tools. Omit and
 *   every MCP tool is reported as reachable both ways, which is only true when the
 *   two surfaces carry the same set; name them and a server-only tool says so.
 * @property {boolean} [humanHandoff] defaults to true; set false for a demo that does not
 *   demonstrate hand-off.
 * @property {string} [knowledgeFile] where a knowledge-only demo's llms-full.txt is built from
 *   (default: `sites/<name>/knowledge.json`, next to `outDir`); ignored when
 *   gen-content-pages.mjs already wrote public/llms-full.txt from content/*.md.
 */

/**
 * The full corpus of a knowledge-only demo: every knowledge source the assistant
 * is grounded in, in publish order, one `##` section each, with the same head
 * llms.txt carries (H1, Source, blockquote) so a reader that took llms.txt first
 * recognizes it.
 * @param {AgentFilesConfig} config
 * @param {{knowledge_sources?: {label?: string, key?: string, content?: string}[]}} knowledge
 */
export function llmsFullFromKnowledge(config, knowledge) {
  const sources = Array.isArray(knowledge?.knowledge_sources) ? knowledge.knowledge_sources : [];
  const sections = sources
    .filter((k) => typeof k?.content === "string" && k.content.trim())
    .map((k) => `## ${k.label || k.key || "Untitled"}\n\n${k.content.trim()}`);
  return `# ${config.name}\n\nSource: ${config.siteUrl}/\n\n> ${config.description}\n\n`
    + `This is the whole site in one request — the same sources the assistant on the page answers from.\n\n`
    + sections.join("\n\n---\n\n") + "\n";
}

/** @param {AgentFilesConfig} config */
export function generate(config) {
  const hasMcp = Boolean(config.mcpUrl);
  // llms-full.txt: gen-content-pages.mjs writes it for a demo with content/*.md
  // (it runs before this in build-demo.sh). A KNOWLEDGE-ONLY demo — its pages live
  // in knowledge.json, the SAME sources the assistant is grounded in — gets one
  // here from those sources, so no demo is ever served without the full corpus
  // (telegram + whatsapp read 9/14 on /try for exactly this gap, #2815). A demo
  // with neither fails scripts/check-agent-files.sh, never ships a partial set.
  const fullPath = path.join(config.outDir, "llms-full.txt");
  if (!fs.existsSync(fullPath)) {
    const knowledgeFile = config.knowledgeFile ?? path.join(config.outDir, "..", "knowledge.json");
    if (fs.existsSync(knowledgeFile)) {
      fs.writeFileSync(fullPath, llmsFullFromKnowledge(config, JSON.parse(fs.readFileSync(knowledgeFile, "utf8"))));
    }
  }
  const hasLlmsFull = fs.existsSync(fullPath);
  const mcpTools = config.mcpTools || (hasMcp ? toolsFor(config.name) : {});
  const webOnly = config.webmcpOnlyTools || {};
  const alsoWebmcp = config.alsoWebmcp ? new Set(config.alsoWebmcp) : null;
  const allTools = {
    ...Object.fromEntries(Object.entries(mcpTools).map(([n, t]) => [
      n,
      { ...t, transport: !alsoWebmcp || alsoWebmcp.has(n) ? "mcp+webmcp" : "mcp" },
    ])),
    ...Object.fromEntries(Object.entries(webOnly).map(([n, t]) => [n, { ...t, transport: "webmcp" }])),
  };
  const toolLines = Object.entries(allTools)
    .map(([n, t]) => `- \`${n}\` — ${t.description}${t.accessHint === "identified" || t.accessHint === "delegated" ? " (identified visitors only)" : ""}${t.transport === "webmcp" ? " (WebMCP page tool only, not on the MCP server)" : ""}${t.transport === "mcp" ? " (MCP server only, not registered on the page)" : ""}`)
    .join("\n");

  const llms = `# ${config.name}

> ${config.description}

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
${config.pages.map((p) => `- [${p.title}](${p.url})${p.note ? `: ${p.note}` : ""}${p.md ? ` — Markdown: ${p.md}` : ""}`).join("\n")}

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.
${hasMcp ? `
## Act on it (agents)
This site exposes an MCP server at \`${config.mcpUrl}\` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
${toolLines}

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (\`document.modelContext\`, see \`/agents.json\` and
\`/webmcp-catalog.json\`), for a browser agent that never leaves the page.
` : `
## Act on it (agents)
This page has no MCP server of its own; every action it publishes is a WebMCP
page tool only, registered in the page (\`document.modelContext\`, see
\`/agents.json\` and \`/webmcp-catalog.json\`), for a browser agent that never
leaves the page:
${toolLines}
`}
${config.identityDocsUrl ? `## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see ${config.identityDocsUrl}.${config.identityDemoNote ? ` ${config.identityDemoNote}` : ""}
` : ""}
## Learn more
${config.docs.map((d) => `- [${d.title}](${d.url})${d.note ? `: ${d.note}` : ""}`).join("\n")}

## Optional
${hasLlmsFull ? `- [llms-full.txt](${config.siteUrl}/llms-full.txt): every page above, in full, in one request\n` : ""}- [agents.json](${config.siteUrl}/agents.json): the machine-readable card for this site
- [webmcp-catalog.json](${config.siteUrl}/webmcp-catalog.json): the page tools, readable without running the page
- [sitemap.xml](${config.siteUrl}/sitemap.xml): every page with an honest last-modified date
${hasMcp ? `- [MCP endpoint](${config.mcpUrl}): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone\n` : ""}`;

  const agentsJson = {
    name: config.name,
    url: config.siteUrl,
    description: config.description,
    mcp: hasMcp ? { url: config.mcpUrl, transport: "http", auth: "none" } : null,
    webmcp: { transport: "in-page", registers: "document.modelContext" },
    tools: Object.entries(allTools).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: t.inputSchema,
      readOnlyHint: !!t.readOnlyHint,
      access: t.accessHint || "public",
      transport: t.transport,
      ...(t.confirmHint ? { confirmationRequired: true } : {}),
    })),
    identity: {
      supported: Boolean(config.identityDocsUrl),
      ...(config.identityDocsUrl ? { docs: config.identityDocsUrl } : {}),
    },
    humanHandoff: config.humanHandoff !== false,
  };

  fs.mkdirSync(config.outDir, { recursive: true });
  fs.writeFileSync(path.join(config.outDir, "llms.txt"), llms);
  fs.writeFileSync(path.join(config.outDir, "llms.txt.md"), llms);
  const agentsJsonText = JSON.stringify(agentsJson, null, 2) + "\n";
  fs.writeFileSync(path.join(config.outDir, "agents.json"), agentsJsonText);
  // Every demo's <link rel="alternate" ... href="/.well-known/agents.json"> pointed at a file
  // that was never written (a repo-wide gap the AI-readiness checker's "agents.json" check
  // catches — it looks at the well-known path, not the bare one). Same content, both paths.
  fs.mkdirSync(path.join(config.outDir, ".well-known"), { recursive: true });
  fs.writeFileSync(path.join(config.outDir, ".well-known", "agents.json"), agentsJsonText);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("usage: node gen-agent-files.mjs <config.mjs>");
    process.exit(1);
  }
  const mod = await import(path.resolve(configPath));
  generate(mod.default);
  console.log(`wrote llms.txt, llms.txt.md, agents.json -> ${mod.default.outDir}`);
}
