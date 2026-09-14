/*
 * What this page publishes, as data.
 *
 * Kept apart from the code that runs it so the same list can be read outside a
 * browser — scripts/gen-webmcp-catalog.mjs builds /webmcp-catalog.json from
 * THIS file, so the published catalogue can never drift from what the page
 * registers. Every inputSchema property carries a description: the SDK rejects
 * the whole registerPageTools() call when one is missing.
 */
export const TOOL_SPECS = [
  {
    name: "search_products",
    title: "Search the gear on this page",
    description: "Search Northline Outdoor's catalog by name, keyword or category and get matching products with price, variants and stock.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A product name, keyword or category to search for, e.g. 'rain jacket' or 'tent'." } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "add_to_cart",
    title: "Add a product to the cart",
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
  },
  {
    name: "view_cart",
    title: "Show the cart",
    description: "Show what's currently in this visitor's cart with line totals, subtotal, shipping and total.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "check_order_status",
    title: "Check an order",
    description: "Look up an order's status and tracking by order number and the email on the order.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The order number, as printed on the receipt or confirmation email, e.g. '#1042'." },
        email: { type: "string", description: "The email address the order was placed under." },
      },
      required: ["order_number", "email"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "start_return",
    title: "Start a return",
    description: "Start a return for an item on an order.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The order number the item was purchased on, e.g. '#1042'." },
        email: { type: "string", description: "The email address the order was placed under." },
        sku: { type: "string", description: "The SKU of the item on that order to return." },
        reason: { type: "string", description: "Why the item is being returned, in the customer's own words." },
      },
      required: ["order_number", "email", "sku"],
      additionalProperties: false,
    },
  },
];
