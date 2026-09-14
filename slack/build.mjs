#!/usr/bin/env node
// sites/slack/build.mjs — regenerate public/assets/page-tools.data.js from
// backend/tool-schema.mjs so the page-tool data twin (and through it
// /webmcp-catalog.json) can never drift from the MCP server's tool table.
// Run by scripts/build-demo.sh slack.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor } from "./backend/tool-schema.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const T = toolsFor("Patchwell");
const specs = Object.entries(T).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: !!t.readOnlyHint } }));
fs.writeFileSync(path.join(here, "public", "assets", "page-tools.data.js"),
`// sites/slack/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext
// (see the inline script at the bottom of index.html) — kept here too, as
// plain data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. Both
// are generated from backend/tool-schema.mjs (node sites/slack/build.mjs),
// so the page, the catalog and the MCP server cannot disagree.
export const TOOL_SPECS = ${JSON.stringify(specs, null, 2)};
`);
console.log(`slack: page-tools.data.js — ${specs.length} tools`);
