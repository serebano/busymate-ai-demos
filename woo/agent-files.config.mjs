import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_SCHEMA } from "./backend/tools.mjs";
import { TOOL_SPECS } from "./public/assets/page-tools.data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://woo.demo.busymate.ai";
const DOCS = "https://busymate.ai/docs/guides";

/**
 * The page's own tools, in the shape the generator wants. Read from the SAME
 * descriptor file the page registers from, so this manifest cannot claim a page
 * tool the page does not publish.
 */
const PAGE_TOOLS = Object.fromEntries(
  TOOL_SPECS.map((tool) => [tool.name, {
    description: tool.description,
    inputSchema: tool.inputSchema,
    readOnlyHint: tool.annotations?.readOnlyHint === true,
    ...(tool.annotations?.readOnlyHint === true ? {} : { confirmHint: true }),
  }]),
);

/** @type {import("../_shared/gen-agent-files.mjs").AgentFilesConfig} */
export default {
  siteUrl: SITE,
  name: "Fernweh Supply Co.",
  description:
    "A working demonstration WooCommerce store: a live Busymate AI assistant grounded in this "
    + "shop's own catalogue and policy pages, six of the page's own actions published over WebMCP, "
    + "an MCP server over the shop's real product and order data, a provided demo customer with "
    + "five orders for testing the identified experience, and hand-off to a person.",
  outDir: path.join(__dirname, "public"),
  mcpUrl: `${SITE}/mcp`,
  pages: [
    {
      title: "The shop", url: `${SITE}/`, md: `${SITE}/index.md`,
      note: "Fourteen products across packs and bags, merino layers, bottles and flasks, and notebooks and paper — with prices, stock and the block explaining every capability this demo shows",
    },
    {
      title: "Shipping", url: `${SITE}/shipping/`, md: `${SITE}/shipping.md`,
      note: "What delivery costs and how long it takes to each of the four zones, the free-delivery thresholds, and what happens when a parcel goes missing",
    },
    {
      title: "Returns & Repairs", url: `${SITE}/returns/`, md: `${SITE}/returns.md`,
      note: "The 30-day return window, what is excluded, and the repair service for anything Fernweh made",
    },
    {
      title: "Privacy", url: `${SITE}/privacy/`, md: `${SITE}/privacy.md`,
      note: "What this demonstration store records, and the plain warning not to enter real personal data",
    },
    {
      title: "Terms", url: `${SITE}/terms/`, md: `${SITE}/terms.md`,
      note: "The terms of sale, and the statement that Fernweh Supply Co. is an invented brand that trades with nobody",
    },
  ],
  docs: [
    { title: "Let the assistant use your page (WebMCP)", url: `${DOCS}/page-tools`,
      note: "How the six page tools above are registered" },
    { title: "Connect your MCP server as assistant tools", url: `${DOCS}/connect-mcp-server` },
    { title: "Connect your WooCommerce store", url: `${DOCS}/woocommerce`,
      note: "The store connection this shop is wired through" },
    { title: "Recognise signed-in customers", url: `${DOCS}/identified-visitors` },
    { title: "Ask with a card instead of a paragraph", url: `${DOCS}/form-cards` },
    { title: "Set up human handoff", url: `${DOCS}/human-handoff-setup` },
    { title: "Teach your assistant your own content", url: `${DOCS}/knowledge` },
    { title: "Ask without signing in: the public tools", url: `${DOCS}/public-tools` },
    { title: "Is your website agent-ready? The complete checklist",
      url: "https://busymate.ai/articles/is-your-website-agent-ready-checklist" },
  ],
  identityDocsUrl: `${DOCS}/identified-visitors`,
  identityDemoNote:
    "This store mints the proof itself with its own ES256 key and publishes the key set at "
    + `${SITE}/.well-known/jwks.json. A demo customer with five real orders is provided, one click `
    + "from inside the chat, so the identified experience can be tested without a real account.",
  // The WHOLE table, delegated tools included: the server advertises them
  // because it can verify a delegated caller, and the ones it cannot serve are
  // removed from the table before it starts (see backend/index.mjs).
  mcpTools: TOOL_SCHEMA,
  // No MCP tool is registered on the page and no page tool is on the server:
  // the page acts on the visitor's own session, the server on the shop's data.
  alsoWebmcp: [],
  webmcpOnlyTools: PAGE_TOOLS,
};
