import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolsFor } from "./backend/tool-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://meta.demo.busymate.ai",
  name: "Sol & Salt Swimwear",
  description:
    "A swim and resort-wear demo showing one assistant answering both Meta inboxes: faithful previews of a Messenger thread and an Instagram DM around the live assistant, grounded chat over the collection, size chart and policy, an MCP server over the catalogue, sizing, orders and returns, WebMCP in-page actions, and identified-customer order lookup.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://meta.demo.busymate.ai/mcp",
  mcpTools: toolsFor("Sol & Salt Swimwear"),
  pages: [
    { title: "Sol & Salt Swimwear", url: "https://meta.demo.busymate.ai/" },
    { title: "The Messenger integration", url: "https://busymate.ai/integrations/messenger" },
    { title: "The Instagram integration", url: "https://busymate.ai/integrations/instagram" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Publish your page's actions (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools" },
    { title: "Ask with a form card", url: "https://busymate.ai/docs/guides/form-cards" },
    { title: "Human hand-off", url: "https://busymate.ai/docs/guides/human-handoff-setup" },
    { title: "Busymate AI for Messenger", url: "https://busymate.ai/integrations/messenger" },
    { title: "Busymate AI for Instagram", url: "https://busymate.ai/integrations/instagram" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  identityDemoNote: "A demo customer is provided on the page, so the identified experience — her orders, a cancellation, a return against a real order — can be tested without a real account.",
  alsoWebmcp: ["list_collection", "search_products", "size_guide", "shipping_and_returns", "get_my_orders"],
  webmcpOnlyTools: {
    open_return_form: {
      description: "Open the return card on the page for the visitor to fill in and submit themselves — order number, which piece, reason, one button. Used instead of asking for those three things one at a time in the conversation.",
      inputSchema: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "An order number to prefill, if already known, e.g. 'SS-31082'." },
          item: { type: "string", description: "The piece to prefill, if already known." },
          reason: { type: "string", description: "A reason to prefill, if already known: 'too-small', 'too-large', 'exchange-size', 'not-as-pictured', 'faulty' or 'changed-mind'." },
          note: { type: "string", description: "A note to prefill, if the visitor has already said what they want to happen." },
        },
        additionalProperties: false,
      },
      readOnlyHint: true,
    },
  },
};
