#!/usr/bin/env node
// sites/_shared/gen-glossary.mjs
//
// P14 (WARN): every demo gets a real /glossary page explaining the terms its
// own agent-discovery layer uses (MCP, WebMCP, llms.txt, agents.json, A2A,
// OpenAPI…) — generic content, same for every demo (these are protocol
// terms, not this brand's own words), skinned only with the demo's own name
// and back-link. One generator, every demo inherits it; never hand-authored
// per demo.
//
// Usage: node sites/_shared/gen-glossary.mjs <path-to-demo-config.mjs>
// (the SAME config module gen-agent-files.mjs takes)
import fs from "node:fs";
import path from "node:path";

const TERMS = [
  ["MCP (Model Context Protocol)", "The open protocol an AI assistant uses to call a site's own tools and read its own data over a standard JSON-RPC interface, instead of scraping HTML. This site's MCP server answers at `/mcp`; its card is at `/.well-known/mcp.json`."],
  ["WebMCP", "The in-page twin of MCP: the page itself registers tools on `document.modelContext`, so a browser-based agent can act on exactly what a visitor sees, without leaving the page. See `/webmcp-catalog.json`."],
  ["llms.txt", "A short, curated Markdown index of a site's key pages and what an assistant can do with it — the first file an agent should read. See `/llms.txt`."],
  ["agents.json", "This site's bespoke discovery card (name, description, MCP/WebMCP endpoints, tools, identity, human hand-off) — see `/agents.json`. The DIFFERENT `/.well-known/agents.json` document below follows a separate community schema."],
  ["agents.json (v0.1.0 tool-actions schema)", "A community schema (agentsjson.org) describing a site's callable operations as \"flows\" over an OpenAPI source, referenced by `operationId`. Served at `/.well-known/agents.json` — a different document from the bare `/agents.json` card above."],
  ["AGENTS.md", "The agents.md convention's free-form contextual guide for a coding/AI agent working with this project — what it is, how to read it, what it may do. See `/AGENTS.md`."],
  ["OpenAPI", "A machine-readable, industry-standard description of an HTTP API's operations and schemas. See `/openapi.json`."],
  ["A2A (Agent-to-Agent protocol)", "A protocol for one AI agent to discover and call another agent as a peer, via an Agent Card. This demo does not implement A2A: `/.well-known/agent-card.json` answers an honest 404 rather than a fabricated card."],
  ["MCP Server Card", "A small, standard document describing an MCP server's identity and how to reach it (never its live tool list, which stays behind the protocol itself). See `/.well-known/mcp.json`."],
  ["Content negotiation", "Asking the SAME URL for a different representation via the `Accept` header — `Accept: text/markdown` on any page here returns its Markdown twin at the same address, no redirect."],
  ["Structured data (JSON-LD)", "Machine-readable facts embedded in a page's own HTML (`<script type=\"application/ld+json\">`) describing what the page IS, so a reader never has to guess from prose."],
];

/** @param {import("./gen-agent-files.mjs").AgentFilesConfig} config */
export function generate(config) {
  const rows = TERMS.map(([term, def]) => `<dt>${term}</dt><dd>${def}</dd>`).join("\n");
  const mdRows = TERMS.map(([term, def]) => `### ${term}\n\n${def}`).join("\n\n");
  const today = new Date().toISOString().slice(0, 10);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glossary — ${config.name}</title>
<meta name="description" content="What MCP, WebMCP, llms.txt, agents.json, A2A and the rest of this site's agent-discovery layer actually mean.">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${config.siteUrl}/glossary">
<link rel="alternate" type="text/markdown" href="/glossary.md" title="This page as Markdown">
<link rel="describedby" href="/llms.txt">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${config.siteUrl}/glossary#glossary`,
    name: `${config.name} — Glossary`,
    description: "What this site's agent-discovery terms mean.",
    url: `${config.siteUrl}/glossary`,
    dateModified: today,
    hasDefinedTerm: TERMS.map(([term, def]) => ({ "@type": "DefinedTerm", name: term, description: def })),
  })}</script>
<style>
  .doc{max-width:720px;margin:0 auto;padding:44px 20px 70px}
  .doc h1{font-size:clamp(28px,4vw,40px);margin:0 0 10px}
  .doc dl{display:grid;gap:22px;margin:28px 0}
  .doc dt{font-weight:600;font-size:16px}
  .doc dd{margin:4px 0 0;color:var(--muted)}
  .backlink{display:inline-flex;align-items:center;gap:10px;margin-bottom:22px;text-decoration:none;
            font-family:ui-serif,Georgia,serif;font-size:17px;font-weight:600}
</style>
</head>
<body>
<article class="doc">
  <a class="backlink" href="/"><span>← ${config.name}</span></a>
  <h1>Glossary</h1>
  <p>What the terms on this site's agent-discovery layer actually mean — the same layer <a href="/llms.txt">llms.txt</a>, <a href="/agents.json">agents.json</a> and <a href="/openapi.json">openapi.json</a> publish.</p>
  <dl>${rows}</dl>
</article>
</body>
</html>
`;
  fs.writeFileSync(path.join(config.outDir, "glossary.html"), html);
  fs.writeFileSync(
    path.join(config.outDir, "glossary.md"),
    `---\ntitle: "Glossary — ${config.name}"\ndescription: "What this site's agent-discovery terms mean."\nlast_updated: ${today}\n---\n\n`
    + `# Glossary\n\nSource: ${config.siteUrl}/glossary\n\n${mdRows}\n\n## Sitemap\n\nEvery page on this site: [sitemap.md](${config.siteUrl}/sitemap.md)\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("usage: node gen-glossary.mjs <config.mjs>");
    process.exit(1);
  }
  const mod = await import(path.resolve(configPath));
  generate(mod.default);
  console.log(`wrote glossary.html, glossary.md -> ${mod.default.outDir}`);
}
