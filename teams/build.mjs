#!/usr/bin/env node
// sites/teams/build.mjs — regenerate public/assets/page-tools.data.js from
// backend/tool-schema.mjs so the page-tool data twin (and through it
// /webmcp-catalog.json) can never drift from the MCP server's tool table.
// Run by scripts/build-demo.sh teams.
//
// The page registers the four READS the server serves, plus the one page-only
// tool that opens the leave form already on this page. The two WRITES
// (request_leave, update_bank_details_request) stay on the MCP server, where
// they carry their action card — the page's own form submits to request_leave
// over /mcp when a visitor fills it in.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor, pageOnlyToolsFor } from "./backend/tool-schema.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const STORE = "Bramble & Co.";
const PAGE_READS = ["list_benefit_plans", "get_payroll_calendar", "search_policies", "get_my_leave_balance"];

const server = toolsFor(STORE);
const pageOnly = pageOnlyToolsFor(STORE);

const spec = ([name, t], source) => ({
  name,
  description: t.description,
  inputSchema: t.inputSchema,
  annotations: { readOnlyHint: !!t.readOnlyHint },
  source,
});

const specs = [
  ...PAGE_READS.map((name) => spec([name, server[name]], "mcp")),
  ...Object.entries(pageOnly).map((entry) => spec(entry, "page")),
];

fs.writeFileSync(
  path.join(here, "public", "assets", "page-tools.data.js"),
  `// sites/teams/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext (see
// the module script at the bottom of index.html) — kept here too, as plain
// data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. Generated
// from backend/tool-schema.mjs (node sites/teams/build.mjs), so the page, the
// catalogue and the MCP server cannot disagree.
//
// \`source\` says where each tool's work actually happens: "mcp" calls this
// site's own /mcp endpoint, "page" runs in the page itself and exists nowhere
// else.
export const TOOL_SPECS = ${JSON.stringify(specs, null, 2)};
`,
);
console.log(`teams: page-tools.data.js — ${specs.length} page tools`);
