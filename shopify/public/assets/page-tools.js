/*
 * What this page can do, published as WebMCP tools.
 *
 * The descriptors live in page-tools.data.js (also the source of
 * /webmcp-catalog.json); this module gives each one the function that runs it.
 * Cart tools run right here, through the same code the page's own buttons use
 * (window.Northline, defined by store.js); order/return calls go to this
 * site's own MCP server at /mcp so the tool logic has exactly one source of
 * truth. https://busymate.ai/docs/guides/page-tools
 */
import { TOOL_SPECS } from "./page-tools.data.js";

async function callMcp(name, args) {
  const res = await fetch("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args || {} } }),
  });
  const body = await res.json();
  const text = body?.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : { error: "mcp_call_failed" };
}

const EXECUTE = {
  search_products: (args) => callMcp("search_products", args),
  add_to_cart: async ({ sku, qty, variant }) => window.Northline.addToCart(sku, qty, variant, { open: true }),
  view_cart: async () => window.Northline.cart(),
  check_order_status: (args) => callMcp("get_order_status", args),
  start_return: (args) => callMcp("start_return", args),
};

export const TOOLS = TOOL_SPECS.map((spec) => ({ ...spec, execute: EXECUTE[spec.name] }));

/** The embed script loads `async`, so it may not have defined the API yet. */
async function waitForSdk(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (typeof window.BusymateAI?.registerPageTools === "function") return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

// Register, and SAY SO: registerPageTools validates every property of every
// inputSchema, and an un-awaited rejection used to turn into zero tools with
// no visible error. The outcome lands on <html data-page-tools> for proofs.
(async () => {
  const root = document.documentElement;
  if (!(await waitForSdk())) { root.dataset.pageTools = "sdk_absent"; return; }
  try {
    await window.BusymateAI.registerPageTools(TOOLS);
    root.dataset.pageTools = "registered";
    root.dataset.pageToolNames = TOOLS.map((t) => t.name).join(",");
  } catch (error) {
    root.dataset.pageTools = "failed";
    console.error("registerPageTools failed:", error?.message);
  }
})();
