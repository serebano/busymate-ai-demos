import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor } from "./backend/tool-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://whatsapp.demo.busymate.ai",
  name: "Marlow's Kitchen",
  description:
    "A neighborhood restaurant demo showing 'your mate' on WhatsApp: a live preview of the WhatsApp conversation, grounded chat, an MCP server over the restaurant's own menu/hours/table data, WebMCP in-page booking actions, and identified-visitor reservation lookup.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://whatsapp.demo.busymate.ai/mcp",
  mcpTools: toolsFor("Marlow's Kitchen"),
  pages: [
    { title: "Marlow's Kitchen", url: "https://whatsapp.demo.busymate.ai/" },
    { title: "The WhatsApp integration", url: "https://busymate.ai/integrations/whatsapp" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Publish your page's actions (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Busymate AI for WhatsApp", url: "https://busymate.ai/integrations/whatsapp" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  alsoWebmcp: ["opening_hours", "list_menu", "search_menu", "check_availability", "book_table", "get_my_reservations", "cancel_reservation"],
  webmcpOnlyTools: {
    open_booking_form: {
      description: "Open an inline booking form on the page for the visitor to fill in and submit themselves — name, phone, party size, date and time, one \"Book table\" button. Used instead of asking for those details one at a time in the conversation.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "A YYYY-MM-DD date to prefill, if already known." },
          time: { type: "string", description: "A 24-hour HH:MM time to prefill, if already known." },
          party_size: { type: "number", description: "A party size to prefill, if already known." },
          name: { type: "string", description: "A name to prefill, if already known." },
          phone: { type: "string", description: "A phone number to prefill, if already known." },
        },
        additionalProperties: false,
      },
      readOnlyHint: true,
    },
  },
};
