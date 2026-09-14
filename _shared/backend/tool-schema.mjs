// sites/_shared/backend/tool-schema.mjs
//
// The tool NAMES/descriptions/inputSchemas exposed by every "full-feature"
// demo's MCP server (sites/_shared/backend/mcp-identity-server.mjs) — pulled
// out on its own so the SAME definitions drive both the live MCP server
// (`/mcp`) and the static agent-discovery files (llms.txt, agents.json) via
// sites/_shared/gen-agent-files.mjs. One source of truth, two consumers.
// `{store}` in a description is replaced with the demo's storeName.
//
// GOTCHA (found live, 2026-09-11): the platform's `registerPageTools` SDK
// validates every inputSchema PROPERTY, not just the tool-level description
// — a property with no `description` rejects the WHOLE registerPageTools()
// call, and since the call isn't awaited-with-catch on the page it fails
// SILENTLY (document.modelContext.getTools() just stays empty, no visible
// error). Every property below carries a description for exactly this
// reason — never add one without it.
export const STORE_TOOL_SCHEMA = {
  list_products: {
    description: "List every product {store} sells, with price and stock.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },
  search_products: {
    description: "Search {store}'s catalog by name or keyword.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A product name or keyword to search for, e.g. 'rain jacket'." } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  get_product: {
    description: "Get one product's full detail by SKU.",
    inputSchema: {
      type: "object",
      properties: { sku: { type: "string", description: "The product's SKU code, as shown on its product card." } },
      required: ["sku"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  get_order_status: {
    description: "Look up an order's status and tracking by order number + the email on the order. Call it as soon as a shopper asks about an order — even before they give the number: the call shows an order-lookup card in the chat where they type it. Requires an identified (signed-in) visitor on a real store.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The order number, as printed on the receipt or confirmation email, e.g. '#1042'." },
        email: { type: "string", description: "The email address the order was placed under." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },
  start_return: {
    description: "Start a return for an item on an order. Call it as soon as a shopper wants to return something — the call shows a return card in the chat where they pick the order, the item and the reason. Requires an identified (signed-in) visitor on a real store; this demo does not actually process anything.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The order number the item was purchased on, e.g. '#1042'." },
        email: { type: "string", description: "The email address the order was placed under." },
        sku: { type: "string", description: "The SKU of the item on that order to return." },
        reason: { type: "string", description: "Why the item is being returned, in the customer's own words." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "identified",
    confirmHint: true,
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(STORE_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
