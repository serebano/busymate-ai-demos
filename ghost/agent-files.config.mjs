// sites/ghost/agent-files.config.mjs
//
// Feeds sites/_shared/backend/agent-ready-static.mjs (which itself imports
// gen-agent-files.mjs / gen-protocol-files.mjs — never a copy) from
// backend/agent-ready.mjs. The magazine's own pages are genuinely dynamic
// (Ghost's live Content API — llms.txt already reads it per-request, kept
// that way below) but the DISCOVERY layer this config drives (agents.json,
// openapi.json, agent-permissions.json, the MCP server card, sitemap/robots)
// is not: same tool table on every request, so it is computed once.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_TABLE } from "./backend/tools.mjs";
import { CONTACT } from "./backend/store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://ghost.demo.busymate.ai";
const DOCS = "https://busymate.ai/docs/guides";

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: SITE,
  name: "The Meridian Line",
  description:
    "A working demonstration Ghost publication: a live Busymate AI assistant grounded in the "
    + "magazine's own articles, one of the page's own actions published over WebMCP, an MCP "
    + "server over the magazine's real Content API, a provided demo member for testing the "
    + "identified experience, and hand-off to a person.",
  outDir: "", // set by agent-ready-static.mjs to a scratch dir
  mcpUrl: `${SITE}/mcp`,
  pages: [
    { title: "The Meridian Line", url: `${SITE}/`, note: "An independent magazine about makers, small manufacturing and local economies — the latest articles, read live off the magazine's own Content API" },
  ],
  docs: [
    { title: "Let the assistant use your page (WebMCP)", url: `${DOCS}/page-tools` },
    { title: "Connect your MCP server as assistant tools", url: `${DOCS}/connect-mcp-server` },
    { title: "Recognise signed-in members", url: `${DOCS}/identified-visitors` },
    { title: "Set up human handoff", url: `${DOCS}/human-handoff-setup` },
    { title: "Teach your assistant your own content", url: `${DOCS}/knowledge` },
    { title: "Ask without signing in: the public tools", url: `${DOCS}/public-tools` },
    { title: "Is your website agent-ready? The complete checklist",
      url: "https://busymate.ai/articles/is-your-website-agent-ready-checklist" },
  ],
  identityDocsUrl: `${DOCS}/identified-visitors`,
  identityDemoNote:
    "This publication mints the proof itself with its own ES256 key and publishes the key set at "
    + `${SITE}/.well-known/jwks.json. A demo member (Nadia Ferro) is provided, one click from `
    + "inside the chat, so the identified experience can be tested without a real account.",
  contactEmail: CONTACT.email,
  knowledgeFile: path.join(__dirname, "knowledge.json"),
  mcpTools: TOOL_TABLE,
  // list_articles is the one tool this demo's OWN page registers over WebMCP
  // (Code Injection — see README "The full-feature checklist"); the rest are
  // MCP-server-only, honestly marked so.
  alsoWebmcp: ["list_articles"],
};
