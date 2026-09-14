import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: "https://shopify.demo.busymate.ai",
  name: "Northline Outdoor",
  description:
    "Northline Outdoor — a sample Shopify storefront (20 products: tents, packs, shells, boots, camp kitchen, sleep + light; lifetime warranty, free US shipping over $75) demonstrating the Busymate AI Shopify app: grounded product/policy chat, an MCP server over the store's own data, WebMCP in-page cart actions, and identified-visitor order lookup.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: "https://shopify.demo.busymate.ai/mcp",
  pages: [
    { title: "Storefront", url: "https://shopify.demo.busymate.ai/" },
    { title: "Catalog (JSON)", url: "https://shopify.demo.busymate.ai/catalog.json" },
    { title: "Photo credits", url: "https://shopify.demo.busymate.ai/img/CREDITS.md" },
    { title: "The Shopify integration", url: "https://busymate.ai/integrations/shopify" },
  ],
  docs: [
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Identified visitors", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Busymate AI for Shopify", url: "https://busymate.ai/integrations/shopify" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  webmcpOnlyTools: {
    add_to_cart: {
      description: "Add a product (by SKU, optionally a specific variant) to this visitor's cart on this page. The cart badge and drawer update immediately.",
      inputSchema: {
        type: "object",
        properties: {
          sku: { type: "string", description: "The product's SKU code, as shown on its product card (e.g. TRAIL-SHELL)." },
          qty: { type: "number", description: "How many to add. Defaults to 1." },
          variant: { type: "string", description: "Optional variant label like 'Moss / M' or 'Slate'. Defaults to the first in-stock variant." },
        },
        required: ["sku"],
        additionalProperties: false,
      },
      readOnlyHint: false,
    },
    view_cart: {
      description: "Show what's currently in this visitor's cart with line totals, subtotal, shipping and total.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      readOnlyHint: true,
    },
  },
};
