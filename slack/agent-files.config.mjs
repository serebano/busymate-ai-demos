import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor } from "./backend/tool-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://slack.demo.busymate.ai",
  name: "Patchwell",
  description:
    "An IT-helpdesk-for-small-teams demo showing 'your mate' inside Slack: a live Slack-style view of the assistant, grounded chat over the service catalogue and plans, an MCP server over tickets, access requests, help articles and live system status, WebMCP in-page helpdesk actions, and identified-customer ticket lookup.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://slack.demo.busymate.ai/mcp",
  mcpTools: toolsFor("Patchwell"),
  pages: [
    { title: "Patchwell", url: "https://slack.demo.busymate.ai/" },
    { title: "The Slack integration", url: "https://busymate.ai/integrations/slack" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Publish your page's actions (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Human hand-off", url: "https://busymate.ai/docs/guides/human-handoff-setup" },
    { title: "Busymate AI for Slack", url: "https://busymate.ai/integrations/slack" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  identityDemoNote: "A demo customer is provided on the page, so the identified experience can be tested without a real account.",
  alsoWebmcp: [
    "service_hours", "list_services", "search_help", "system_status",
    "open_ticket", "request_access", "ticket_status", "get_my_tickets",
  ],
};
