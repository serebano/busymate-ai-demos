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

/**
 * The resolved tool table a demo actually advertises — the SAME computation
 * `generate()` below uses to write llms.txt/agents.json, pulled out so
 * sites/_shared/gen-protocol-files.mjs (openapi.json, the MCP server card,
 * the agents.json v0.1.0 tool-actions manifest, agent-permissions.json) can
 * never drift from what this file publishes: one source of truth, several
 * consumers, never a second hand-rolled merge of mcpTools + webmcpOnlyTools.
 * @param {AgentFilesConfig} config
 */
export function resolveTools(config) {
  const hasMcp = Boolean(config.mcpUrl);
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
  return { hasMcp, allTools };
}

/** @param {AgentFilesConfig} config */
export function generate(config) {
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
  // sitemap.md (S10/S11): gen-content-pages.mjs writes a fuller one for a
  // demo with content/*.md (it runs before this in build-demo.sh). A
  // knowledge-only demo (no content/ dir) gets a minimal one here from the
  // SAME `pages` list llms.txt already publishes — headings + links, never
  // a bare list of bare URLs — so no demo ships without one.
  const sitemapMdPath = path.join(config.outDir, "sitemap.md");
  if (!fs.existsSync(sitemapMdPath)) {
    const today = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(
      sitemapMdPath,
      `---\ntitle: "${config.name} — Sitemap"\ndescription: "Every page on ${config.name}."\nlast_updated: ${today}\n---\n\n`
      + `# Sitemap\n\nSource: ${config.siteUrl}/sitemap.md\n\n## Pages\n\n`
      + config.pages.map((p) => `- [${p.title}](${p.url})${p.md ? ` — Markdown: ${p.md}` : ""}`).join("\n")
      + `\n\n## Discovery\n\n- [llms.txt](${config.siteUrl}/llms.txt)\n- [agents.json](${config.siteUrl}/agents.json)\n`
      + `- [openapi.json](${config.siteUrl}/openapi.json)\n- [webmcp-catalog.json](${config.siteUrl}/webmcp-catalog.json)\n`
      + `- [sitemap.xml](${config.siteUrl}/sitemap.xml)\n`,
    );
  }
  const { hasMcp, allTools } = resolveTools(config);
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
${hasLlmsFull ? `- [llms-full.txt](${config.siteUrl}/llms-full.txt): every page above, in full, in one request\n` : ""}- [agents.json](${config.siteUrl}/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](${config.siteUrl}/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](${config.siteUrl}/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](${config.siteUrl}/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](${config.siteUrl}/sitemap.xml): every page with an honest last-modified date
${hasMcp ? `- [MCP endpoint](${config.mcpUrl}): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone\n` : ""}
## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](${config.siteUrl}/sitemap.md)`;

  // YAML frontmatter for the .md twins (P16): values are double-quoted so a
  // colon or apostrophe in a name/description can never break the parse.
  const yamlStr = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
  const today = new Date().toISOString().slice(0, 10);
  const frontMatter = (title, description) => `---
title: ${yamlStr(title)}
description: ${yamlStr(description)}
last_updated: ${today}
---

`;

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

  // AGENTS.md (S12/S13): the agents.md convention's contextual guide for a
  // coding/AI agent — free-form Markdown, any headings (agents.md has no
  // required schema), but this one always covers what this site is, how to
  // read it without a browser, what it will let an agent DO, and what it
  // will never do (this is a sandbox, nothing here is real). Same facts as
  // llms.txt, restated for the convention that looks for this exact path.
  const agentsMd = `# AGENTS.md

## Project overview
${config.name} — ${config.description}

## How an agent should read this site
Start at [llms.txt](${config.siteUrl}/llms.txt) for the indexed page list, or
[llms-full.txt](${config.siteUrl}/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus \`.md\`
(content negotiation: send \`Accept: text/markdown\` and the same URL returns
it). [sitemap.md](${config.siteUrl}/sitemap.md) lists every page as headings
and links; [openapi.json](${config.siteUrl}/openapi.json) and
[/.well-known/agents.json](${config.siteUrl}/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (\`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>\`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](${config.siteUrl}/llms.txt).

## Configuration
${hasMcp ? `This demo's own MCP server is configured at \`${config.mcpUrl}\` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). ` : ""}What this page will let an agent do — and what it MUST confirm with the
visitor first — is declared in [agent-permissions.json](${config.siteUrl}/agent-permissions.json).

## Usage & examples
${hasMcp ? `Call this site's MCP server at \`${config.mcpUrl}\` (JSON-RPC 2.0, no credential needed to connect):\n${toolLines}` : `Every action below is a WebMCP page tool only (registered on the page, not a separate server):\n${toolLines}`}

${config.identityDocsUrl ? `A tool marked "identified visitors only" needs a signed launch proof — see ${config.identityDocsUrl}.${config.identityDemoNote ? ` ${config.identityDemoNote}` : ""}\n\n` : ""}## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
${config.humanHandoff !== false ? "Ask the assistant for a person and a human joins the same conversation from the team Inbox." : "This demo does not exercise human hand-off."}
`;

  fs.mkdirSync(config.outDir, { recursive: true });
  fs.writeFileSync(path.join(config.outDir, "llms.txt"), llms);
  fs.writeFileSync(path.join(config.outDir, "llms.txt.md"), frontMatter(config.name, config.description) + llms);
  fs.writeFileSync(path.join(config.outDir, "AGENTS.md"), agentsMd);
  const agentsJsonText = JSON.stringify(agentsJson, null, 2) + "\n";
  fs.mkdirSync(path.join(config.outDir, ".well-known"), { recursive: true });
  // NOTE (#2905/C6, corrected against a live agent-ready.dev rescan on
  // 2026-09-14): the "agents.json v0.1.0" wildcard/tool-actions checker
  // reads the BARE `/agents.json` path, not `.well-known/agents.json` — the
  // opposite of what the original ticket assumed. This bespoke discovery
  // card (name/url/description/mcp/webmcp/tools/identity/humanHandoff) —
  // Busymate's own convention, not checked by any known external scanner —
  // therefore moves to `.well-known/agents.json`; sites/_shared/
  // gen-protocol-files.mjs now writes the REAL agentsJson v0.1.0 document to
  // the bare path.
  fs.writeFileSync(path.join(config.outDir, ".well-known", "agents.json"), agentsJsonText);
  // with the actual agents.json v0.1.0 tool-actions schema (#2905/C6).
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("usage: node gen-agent-files.mjs <config.mjs>");
    process.exit(1);
  }
  const mod = await import(path.resolve(configPath));
  generate(mod.default);
  console.log(`wrote llms.txt, llms.txt.md, AGENTS.md, agents.json -> ${mod.default.outDir}`);
}
