/*
 * What this page publishes, as data.
 *
 * Kept apart from the code that runs it so the same list can be read outside a
 * browser — the generator builds /webmcp-catalog.json and /agents.json from
 * THIS file, so the published catalogue can never drift from the registration.
 */
export const TOOL_SPECS = [
  {
    name: "search_coffee",
    title: "Search the coffee on this page",
    description:
      "Search Northwind's range by name, origin, roast, tasting note or use "
      + "(espresso, filter, decaf, gift) and return price, size and stock.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the shopper is after, e.g. 'fruity pour-over' or 'decaf'" },
        decafOnly: { type: "boolean", description: "Only decaffeinated coffee" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "add_to_cart",
    title: "Add a coffee to the cart",
    description: "Put a bag of one of Northwind's coffees in this visitor's cart, by SKU or by name.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU or the coffee's name" },
        qty: { type: "integer", minimum: 1, maximum: 12, description: "How many bags (default 1)" },
      },
      required: ["sku"],
      additionalProperties: false,
    },
  },
  {
    name: "view_cart",
    title: "Read the cart",
    description: "What is in the cart right now, with the subtotal, the delivery charge and the total.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_order_status",
    title: "Where is my order",
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
    annotations: { readOnlyHint: true },
  },
  {
    name: "start_return",
    title: "Start a return",
    description:
      "Open a return for one item on one of the signed-in customer's orders and report "
      + "the refund and what happens next.",
    inputSchema: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "The order the item came in" },
        sku: { type: "string", description: "The SKU or name of the item going back" },
        reason: { type: "string", description: "Why, in the customer's own words" },
      },
      required: ["orderNumber", "sku"],
      additionalProperties: false,
    },
  },
];
