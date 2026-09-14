import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_TABLE } from "./backend/tools.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://scan.demo.busymate.ai";

// What the MCP server actually serves (strip the handler; everything is
// advertised — Beacon has no un-verified delegated tool waiting on a
// per-connector secret the way the retail demos briefly did).
const MCP_TOOLS = Object.fromEntries(
  Object.entries(TOOL_TABLE).map(([name, t]) => [name, {
    description: t.description, inputSchema: t.inputSchema, readOnlyHint: !!t.readOnlyHint, accessHint: t.accessHint,
  }]),
);

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: SITE,
  name: "Beacon",
  description:
    "A demo of the Busymate AI site-scan quick start: paste any public website address and see "
    + "the grounded assistant preview and AI-readiness scorecard it produces in one click, with no "
    + "sign-up and no card. Beacon's own MCP server can score any host live, and a provided demo "
    + "visitor can sign in to see their scan history for this session.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: `${SITE}/mcp`,
  mcpTools: MCP_TOOLS,
  // The four public tools are ALSO registered in the page over WebMCP; the
  // fifth (my_recent_scans) answers only the platform's own signed actor
  // token, so it is MCP-only, never on the page.
  alsoWebmcp: ["scan_site", "list_examples", "show_example", "get_readiness"],
  pages: [
    { title: "The quick-start demo", url: `${SITE}/` },
  ],
  docs: [
    { title: "Let the assistant use your page (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Recognize signed-in visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Set up human handoff", url: "https://busymate.ai/docs/guides/human-handoff-setup" },
    { title: "Teach your assistant your own content", url: "https://busymate.ai/docs/guides/knowledge" },
    { title: "Is your website agent-ready? The complete checklist", url: "https://busymate.ai/articles/is-your-website-agent-ready-checklist" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  identityDemoNote: "A demo visitor (Jordan Blake) is provided on the page, so the identified experience — a scan history for this session — can be tested without a real account.",
};
