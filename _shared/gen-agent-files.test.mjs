// node --test sites/_shared/gen-agent-files.test.mjs
//
// #3023 §4 (boss decision, 2026-09-15, supersedes this repo's own
// AGENTS-JSON-DECISION.md): `/agents.json` and `/.well-known/agents.json`
// must be ONE merged document — the OWNER-SPEC v1 shape (version/content/
// interfaces/authentication/contact) canonical, with the agentsjson.org
// v0.1.0 tool-actions manifest (agentsJson/info/sources/flows) and this
// repo's own bespoke discovery card (name/url/tools/identity/humanHandoff)
// merged alongside, never dropped — served BYTE-IDENTICAL at both paths.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate } from "./gen-agent-files.mjs";

function tmpConfig(overrides = {}) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-ready-merge-"));
  return {
    siteUrl: "https://widget.demo.busymate.ai",
    name: "Test Demo",
    description: "A test demo used only by this suite.",
    outDir,
    mcpUrl: "https://widget.demo.busymate.ai/mcp",
    pages: [{ title: "Home", url: "https://widget.demo.busymate.ai/" }],
    docs: [{ title: "Docs", url: "https://busymate.ai/docs" }],
    mcpTools: {
      ping: { description: "Ping the demo.", inputSchema: { type: "object", properties: {}, required: [] } },
    },
    ...overrides,
  };
}

test("agents.json: bare and .well-known are byte-identical", () => {
  const config = tmpConfig();
  generate(config);
  const bare = fs.readFileSync(path.join(config.outDir, "agents.json"), "utf8");
  const wellKnown = fs.readFileSync(path.join(config.outDir, ".well-known", "agents.json"), "utf8");
  assert.equal(bare, wellKnown);
});

test("agents.json: carries the v0.1.0 tool-actions manifest fields", () => {
  const config = tmpConfig();
  generate(config);
  const doc = JSON.parse(fs.readFileSync(path.join(config.outDir, "agents.json"), "utf8"));
  assert.equal(doc.agentsJson, "0.1.0");
  assert.equal(typeof doc.info, "object");
  assert.ok(Array.isArray(doc.sources));
  assert.ok(Array.isArray(doc.flows));
  assert.ok(doc.flows.some((f) => f.id === "ping"));
});

test("agents.json: carries the OWNER-SPEC v1 fields (#3023 §4)", () => {
  const config = tmpConfig();
  generate(config);
  const doc = JSON.parse(fs.readFileSync(path.join(config.outDir, "agents.json"), "utf8"));
  assert.equal(doc.version, "1.0");
  assert.equal(doc.content.llms, "https://widget.demo.busymate.ai/llms.txt");
  assert.equal(doc.content.sitemap, "https://widget.demo.busymate.ai/sitemap.xml");
  assert.equal(doc.content.markdown.contentNegotiation, true);
  assert.ok(Array.isArray(doc.interfaces));
  assert.ok(doc.interfaces.some((i) => i.type === "mcp" && i.url === config.mcpUrl));
  assert.ok(doc.interfaces.some((i) => i.type === "webmcp"));
  assert.equal(typeof doc.authentication, "object");
  assert.equal(typeof doc.contact, "object");
});

test("agents.json: never drops the pre-existing bespoke card fields", () => {
  const config = tmpConfig();
  generate(config);
  const doc = JSON.parse(fs.readFileSync(path.join(config.outDir, "agents.json"), "utf8"));
  assert.equal(doc.name, config.name);
  assert.equal(doc.url, config.siteUrl);
  assert.equal(typeof doc.mcp, "object");
  assert.equal(typeof doc.webmcp, "object");
  assert.ok(Array.isArray(doc.tools));
  assert.ok(doc.tools.some((t) => t.name === "ping"));
  assert.equal(typeof doc.identity, "object");
  assert.equal(doc.humanHandoff, true);
});

test("agents.json: no MCP backend — v1 interfaces carries only webmcp, v0.1.0 sources stays empty", () => {
  const config = tmpConfig({ mcpUrl: undefined, webmcpOnlyTools: { open_chat: { description: "Open the chat.", inputSchema: { type: "object", properties: {}, required: [] } } } });
  generate(config);
  const doc = JSON.parse(fs.readFileSync(path.join(config.outDir, "agents.json"), "utf8"));
  assert.equal(doc.mcp, null);
  assert.deepEqual(doc.sources, []);
  assert.ok(doc.interfaces.every((i) => i.type !== "mcp"));
  assert.ok(doc.interfaces.some((i) => i.type === "webmcp"));
});
