import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor } from "./backend/tool-schema.mjs";
import { PAGE_TOOLS, WEBMCP_ONLY } from "./page-tools.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://discord.demo.busymate.ai",
  name: "Pixelforge Games",
  description:
    "An indie game studio demo showing 'your mate' as a player-support desk in a Discord #support channel: a live preview of the channel conversation, grounded chat over three games and their public patch notes, an MCP server the studio owns, WebMCP page actions, a bug-report action card, and identified-player library and refund lookups.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://discord.demo.busymate.ai/mcp",
  mcpTools: toolsFor("Pixelforge Games"),
  pages: [
    { title: "Pixelforge Games", url: "https://discord.demo.busymate.ai/" },
    { title: "The Discord integration", url: "https://busymate.ai/integrations/discord" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Publish your page's actions (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Ask with a form card", url: "https://busymate.ai/docs/guides/form-cards" },
    { title: "Busymate AI for Discord", url: "https://busymate.ai/integrations/discord" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  identityDemoNote:
    "A throwaway demo player is provided on the page, so the identified experience — a library, a receipt, a refund — can be tested without a real account.",
  alsoWebmcp: PAGE_TOOLS,
  webmcpOnlyTools: WEBMCP_ONLY,
};
