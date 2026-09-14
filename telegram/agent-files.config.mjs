import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor } from "./backend/tool-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://telegram.demo.busymate.ai",
  name: "Nomad Circuits",
  description:
    "A travel-tech and gadget-repair shop demo showing 'your mate' on Telegram: a live preview of the Telegram conversation, grounded chat, an MCP server over the shop's own catalogue/hours/repair data, WebMCP in-page shop actions, and identified-customer order/repair lookup.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://telegram.demo.busymate.ai/mcp",
  mcpTools: toolsFor("Nomad Circuits"),
  pages: [
    { title: "Nomad Circuits", url: "https://telegram.demo.busymate.ai/" },
    { title: "The Telegram integration", url: "https://busymate.ai/integrations/telegram" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Publish your page's actions (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Busymate AI for Telegram", url: "https://busymate.ai/integrations/telegram" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  alsoWebmcp: [
    "opening_hours", "list_catalog", "search_catalog", "place_order",
    "book_repair", "track_order", "get_my_account", "contact_us",
  ],
};
