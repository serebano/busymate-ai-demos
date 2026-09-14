/*
 * What the Fernweh storefront publishes to an agent, as data.
 *
 * Kept apart from the code that runs it so the same list can be read outside a
 * browser: scripts/gen-webmcp-catalog.mjs builds /webmcp-catalog.json from THIS
 * file, so the published catalogue can never drift from what the page registers.
 *
 * Every tool below is something the page itself really does, through the same
 * WooCommerce Store API the theme's own buttons use, in the visitor's own
 * session. Nothing here can do something a visitor could not do by clicking.
 */
export const TOOL_SPECS = [
  {
    name: "search_the_shop",
    title: "Search this shop",
    description:
      "Search the Fernweh range from the page itself and return each match with its SKU, price, "
      + "whether it is in stock and its link — the same catalogue the shop pages show.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the shopper is after, e.g. 'waxed canvas' or 'merino'" },
        inStockOnly: { type: "boolean", description: "Leave out anything that is out of stock" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "view_cart",
    title: "Read the cart",
    description:
      "What is in this visitor's cart right now, with each line, the item count, the delivery "
      + "line and the total.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "add_to_cart",
    title: "Add an item to the cart",
    description:
      "Put one of Fernweh's products in this visitor's cart by SKU or by name, and report the "
      + "cart back. Changes the page, so it is confirmed before it runs.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU (e.g. FW-PK-W28) or the product's name" },
        quantity: { type: "integer", minimum: 1, maximum: 10, description: "How many (default 1)" },
      },
      required: ["sku"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "remove_from_cart",
    title: "Take an item out of the cart",
    description:
      "Remove one line from this visitor's cart by SKU or by name, and report what is left. "
      + "Changes the page, so it is confirmed before it runs.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU or name of the line to remove" },
      },
      required: ["sku"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "open_product",
    title: "Open a product page",
    description:
      "Take this browser to one product's own page, by SKU or by name — the same thing clicking "
      + "the product in the shop does.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU or the product's name" },
      },
      required: ["sku"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "who_is_signed_in",
    title: "Who is signed in here",
    description:
      "Whether a customer is signed in to this store in this browser, and their display name if "
      + "they are. Reports no personal detail beyond the name the store already shows them.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
];
