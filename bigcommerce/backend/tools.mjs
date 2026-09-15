// sites/bigcommerce/backend/tools.mjs
//
// What Copperfield Kitchen Co.'s MCP server offers, and nothing else.
//
// search_products/get_product/get_delivery_and_returns read the store's own
// public catalogue and always work. list_my_orders/get_order_status are
// `accessHint: "delegated"` — the shared server only puts them on
// `tools/list` once a verified actor token (or the demo's own signed-in
// session) can identify the caller, and refuses them with a sign-in card
// until then. Both read BigCommerce LIVE (sites/bigcommerce/backend/
// bigcommerce.mjs) — nothing here is hardcoded demo data.
import {
  searchProducts, productBySku, categories, listOrders, orderStatus,
} from "./bigcommerce.mjs";

const DELIVERY = {
  currency: "USD",
  zones: [
    { where: "United States & Canada", flatRate: "$7.99", freeOver: "$100", typically: "3–5 business days" },
    { where: "Moldova & the EU", flatRate: "$14.99", freeOver: null, typically: "7–14 business days, duties payable on arrival" },
  ],
  note: "This is a demonstration shop: no parcel is ever sent.",
};

export const TOOL_SCHEMA = {
  search_products: {
    description:
      "Search the Copperfield Kitchen Co. range — cookware, bakeware, kitchen tools, tabletop & "
      + "dining, storage & organization — by words, category, price ceiling or availability, "
      + "returning each match with its SKU, price, stock and a link. Reads the store's own live "
      + "catalogue, so it needs no sign-in.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the shopper is after, e.g. 'cast iron skillet' or 'napkins'" },
        category: { type: "string", description: "Narrow to one category: Cookware, Bakeware, Kitchen Tools, Tabletop & Dining, Storage & Organization" },
        inStockOnly: { type: "boolean", description: "Leave out anything that is out of stock" },
        maxPrice: { type: "number", description: "Highest price to include, in USD" },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: (args) => searchProducts(args ?? {}),
  },

  get_product: {
    description:
      "Everything the store publishes about one product — description, weight, price, stock and "
      + "the link — found by SKU or by name.",
    inputSchema: {
      type: "object",
      properties: { sku: { type: "string", description: "The SKU (e.g. CKC-CIS-12) or the product's name" } },
      required: ["sku"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ sku }) => productBySku(sku),
  },

  get_delivery_and_returns: {
    description: "What delivery costs and how long it takes, and the store's category list.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => ({ delivery: DELIVERY, categories: (await categories()).categories }),
  },

  list_my_orders: {
    description:
      "Every order on the signed-in customer's account — number, status, what was in it and the "
      + "total. Answers only for the customer the caller's signed proof identifies.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "delegated",
    handler: (_args, { customerId }) => listOrders(customerId),
  },

  get_order_status: {
    description:
      "Where one of the signed-in customer's orders has got to, what it contains and what the "
      + "status actually means. With no order number it answers about the most recent one. Call "
      + "this the moment an order is asked about — never ask for the order number in prose first: "
      + "call it with whatever you already have and the action card in the chat collects the rest.",
    inputSchema: {
      type: "object",
      properties: { orderNumber: { type: "string", description: "The order number as it appears on the account, e.g. 101" } },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "delegated",
    formCard: {
      title: "Track an order",
      intro: "Which order would you like me to look up?",
      submitLabel: "Track it",
      resultKeys: ["status", "statusMeans", "placed", "total", "items", "shipTo", "detail"],
      fields: [
        { name: "orderNumber", label: "Order number", type: "text", placeholder: "101", help: "Leave it empty and I will take the most recent order on the account." },
      ],
    },
    handler: ({ orderNumber }, { customerId }) => orderStatus(customerId, orderNumber),
  },
};

export const TOOL_TABLE = TOOL_SCHEMA;
