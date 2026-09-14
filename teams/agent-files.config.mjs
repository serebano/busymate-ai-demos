import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor, pageOnlyToolsFor } from "./backend/tool-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://teams.demo.busymate.ai",
  name: "Bramble & Co.",
  description:
    "An HR-and-benefits-desk demo showing 'your mate' in a Microsoft Teams-style chat pane: grounded answers from a 300-person firm's own handbook, an MCP server over the benefit plans and their employee contributions, the payroll calendar and the leave book, WebMCP in-page actions, an inline leave form, and identified-employee leave balances.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://teams.demo.busymate.ai/mcp",
  mcpTools: toolsFor("Bramble & Co."),
  webmcpOnlyTools: pageOnlyToolsFor("Bramble & Co."),
  pages: [
    { title: "Bramble & Co. — people and benefits", url: "https://teams.demo.busymate.ai/" },
    { title: "The Microsoft Teams integration", url: "https://busymate.ai/integrations/teams" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Ground the assistant in your own content", url: "https://busymate.ai/docs/guides/knowledge" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Publish your page's actions (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Ask with a form card, not a paragraph", url: "https://busymate.ai/docs/guides/form-cards" },
    { title: "Human hand-off", url: "https://busymate.ai/docs/guides/human-handoff-setup" },
    { title: "Busymate AI for Microsoft Teams", url: "https://busymate.ai/integrations/teams" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  identityDemoNote:
    "A demo employee is provided on the page, so the identified experience — a person's own leave balance — can be tested without a real account.",
  alsoWebmcp: ["list_benefit_plans", "get_payroll_calendar", "search_policies", "get_my_leave_balance"],
};
