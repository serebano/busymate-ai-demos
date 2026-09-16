// sites/squarespace/agent-files.config.mjs
//
// Feeds the shared gen-agent-files.mjs `buildAgentsJson()` merge from
// backend/wellKnown.mjs's own agentsJson() — never a hand-rolled third shape
// (busymate-devtools#3054; this demo's own agents.json was the "third,
// ad-hoc shape" that issue names).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_SCHEMA } from "./backend/tools.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ORIGIN = process.env.SQSP_DEMO_ORIGIN || "https://squarespace.demo.busymate.ai";
const SITE_ORIGIN = process.env.SQSP_SITE_ORIGIN || "https://bat-vanilla-s2x4.squarespace.com";
const DOCS = "https://busymate.ai/docs/guides";

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: BACKEND_ORIGIN,
  name: "Quiet Pines Yoga",
  description:
    "A boutique yoga studio demo on a real Squarespace trial site: a live Busymate AI assistant "
    + "grounded in the studio's own published pages, an MCP server over its live site content, a "
    + "provided demo visitor for testing the identified experience, and a request-a-human hand-off.",
  outDir: "",
  mcpUrl: `${BACKEND_ORIGIN}/mcp`,
  pages: [
    { title: "Quiet Pines Yoga", url: `${SITE_ORIGIN}/`, note: "The studio's real, live Squarespace trial site (Home, About, Services, Appointments, Contact) — password protected on trial" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: `${DOCS}/connect-mcp-server` },
    { title: "Recognise signed-in visitors", url: `${DOCS}/identified-visitors` },
    { title: "Set up human handoff", url: `${DOCS}/human-handoff-setup` },
    { title: "Is your website agent-ready? The complete checklist",
      url: "https://busymate.ai/articles/is-your-website-agent-ready-checklist" },
  ],
  identityDocsUrl: `${DOCS}/identified-visitors`,
  identityDemoNote:
    "Squarespace's Member Areas is a native-site integration tracked separately; this demo signs a "
    + "provided demo visitor (Sasha Moreau) in the same way the shopify/ghost demos do.",
  mcpTools: TOOL_SCHEMA,
  alsoWebmcp: ["get_page"],
  knowledgeFile: path.join(__dirname, "knowledge.json"),
};
