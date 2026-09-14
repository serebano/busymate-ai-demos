import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_SCHEMA } from "./backend/tools.mjs";

// What the MCP server actually ADVERTISES today. The order and return tools are
// implemented and delegated-gated, but the platform's actor bearer cannot be
// verified here yet (no per-connector verifier is installed), so the server does
// not offer them and neither does this manifest. The page's own tools carry the
// signed-in experience instead, through the session on the page.
const SERVED_OVER_MCP = Object.fromEntries(
  Object.entries(TOOL_SCHEMA).filter(([, tool]) => tool.accessHint !== "delegated"),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://web.demo.busymate.ai";

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: SITE,
  name: "Northwind Coffee Co.",
  description:
    "A working demonstration coffee store: a live Busymate AI assistant grounded in its own "
    + "catalogue and policies, five of the page's own actions published over WebMCP, an MCP "
    + "server holding the catalogue and order book, a provided demo customer for testing the "
    + "identified experience, and a hand-off to a person.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: `${SITE}/mcp`,
  pages: [
    { title: "Storefront", url: `${SITE}/`, md: `${SITE}/index.md`,
      note: "The six coffees with origin, process and price, the roastery's story, reviews and the FAQ" },
    { title: "Delivery", url: `${SITE}/shipping`, md: `${SITE}/shipping.md`,
      note: "What delivery costs, how long it takes, where Northwind ships and what happens if an order goes missing" },
    { title: "Returns and refunds", url: `${SITE}/returns`, md: `${SITE}/returns.md`,
      note: "The two return windows — unopened within 30 days, opened within 14 days of delivery — and what is not covered" },
    { title: "Coffee subscription", url: `${SITE}/subscription`, md: `${SITE}/subscription.md`,
      note: "Cadence, the 15% discount, free delivery, and how to pause, skip, swap or cancel" },
    { title: "Brew guide", url: `${SITE}/brewing`, md: `${SITE}/brewing.md`,
      note: "Ratios, temperatures and timings for pour-over, French press, espresso and AeroPress" },
  ],
  docs: [
    { title: "Let the assistant use your page (WebMCP)", url: "https://busymate.ai/docs/guides/page-tools",
      note: "How the five page tools above are registered" },
    { title: "Connect your MCP server as assistant tools", url: "https://busymate.ai/docs/guides/connect-mcp-server" },
    { title: "Recognize signed-in customers", url: "https://busymate.ai/docs/guides/identified-visitors" },
    { title: "Set up human handoff", url: "https://busymate.ai/docs/guides/human-handoff-setup" },
    { title: "Teach your assistant your own content", url: "https://busymate.ai/docs/guides/knowledge" },
    { title: "Ask without signing in: the public tools", url: "https://busymate.ai/docs/guides/public-tools" },
    { title: "Is your website agent-ready? The complete checklist", url: "https://busymate.ai/articles/is-your-website-agent-ready-checklist" },
  ],
  identityDocsUrl: "https://busymate.ai/docs/guides/identified-visitors",
  identityDemoNote: "A demo customer is provided on the page, so the identified experience can be tested without a real account.",
  mcpTools: SERVED_OVER_MCP,
  // The one the PAGE registers too; the other two are server-only.
  alsoWebmcp: ["search_coffee"],
  webmcpOnlyTools: {
    get_order_status: {
      description:
        "THE tool for any order or delivery question — 'where is my order', tracking, ETA. "
        + "Call this FIRST for that ask, even when the visitor is signed out: a not-signed-in "
        + "refusal is the expected, correct outcome and is what shows the sign-in card. Never "
        + "substitute contact_northwind for this just because it is signed out. Once signed in, "
        + "returns where one of the customer's orders is, with carrier, tracking number "
        + "and expected delivery date. Answers only for the customer signed in on this page.",
      inputSchema: {
        type: "object",
        properties: { orderNumber: { type: "string", description: "The order number, e.g. NW-10432" } },
        required: ["orderNumber"],
        additionalProperties: false,
      },
      readOnlyHint: true,
      accessHint: "identified",
    },
    start_return: {
      description:
        "Open a return for one item on one of the signed-in customer's orders and report "
        + "the refund and what happens next.",
      inputSchema: {
        type: "object",
        properties: {
          orderNumber: { type: "string", description: "The order the item came in" },
          sku: { type: "string", description: "The SKU or name of the item going back" },
          reason: { type: "string", description: "Why it is going back, in the customer's words" },
        },
        required: ["orderNumber", "sku"],
        additionalProperties: false,
      },
      readOnlyHint: false,
      accessHint: "identified",
      confirmHint: true,
    },
    add_to_cart: {
      description: "Put a bag of one of Northwind's coffees in this visitor's cart, by SKU or by name.",
      inputSchema: {
        type: "object",
        properties: { sku: { type: "string" }, qty: { type: "integer", minimum: 1, maximum: 12 } },
        required: ["sku"],
        additionalProperties: false,
      },
      readOnlyHint: false,
      confirmHint: true,
    },
    view_cart: {
      description: "What is in the cart right now, with the subtotal, the delivery charge and the total.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      readOnlyHint: true,
    },
  },
};
