// sites/woo/backend/tools.mjs
//
// What Fernweh's MCP server offers, and nothing else.
//
// Two rules this table is written to keep:
//
//  1. NEVER advertise a tool this server cannot serve. The three public tools
//     read the shop's own public Store API and always work. The three that
//     answer about a customer are `accessHint: "delegated"` — the shared server
//     only puts them on `tools/list` once a verified actor token can identify
//     the caller, and refuses them with a sign-in card until then.
//
//  2. A tool that needs details from a person declares a `formCard`, so the
//     host mounts fields and a button in the chat rather than the assistant
//     writing out a list of things to type.
import {
  searchProducts, productBySku, categories,
  listOrders, orderStatus, startReturn,
} from "./woo.mjs";

/** The shipping table, as the store's own four zones state it. */
const DELIVERY = {
  currency: "EUR",
  zones: [
    { where: "Germany", flatRate: "€4.90", freeOver: "€120", typically: "1–2 working days" },
    { where: "European Union", flatRate: "€9.90", freeOver: "€180", typically: "2–5 working days" },
    { where: "United Kingdom & Switzerland", flatRate: "€14.90", freeOver: "€250", typically: "3–7 working days, duties payable on arrival" },
    { where: "Rest of world", flatRate: "€24.90", freeOver: null, typically: "7–21 working days, duties payable on arrival" },
  ],
  note: "Dispatch is from Leipzig. This is a demonstration shop: no parcel is ever sent.",
  page: "https://woo.demo.busymate.ai/shipping/",
};

export const TOOL_SCHEMA = {
  search_products: {
    description:
      "Search the Fernweh Supply Co. range — packs and bags, merino layers, bottles and flasks, "
      + "notebooks and paper — by words, category, price ceiling or availability, and return each "
      + "match with its SKU, price, whether it is in stock and a link to its page. Reads the shop's "
      + "own public catalogue, so it needs no sign-in.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the shopper is after, e.g. 'waxed canvas pack' or 'merino socks'" },
        category: { type: "string", description: "Narrow to one category: packs-and-bags, merino-layers, bottles-and-flasks, notebooks-and-paper" },
        inStockOnly: { type: "boolean", description: "Leave out anything that is out of stock" },
        maxPrice: { type: "number", description: "Highest price to include, in euros" },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: (args) => searchProducts(args ?? {}),
  },

  get_product: {
    description:
      "Everything the shop publishes about one product — full description, materials, weight, "
      + "dimensions, price, whether it is in stock, and the link — found by SKU or by name.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU (e.g. FW-PK-W28) or the product's name" },
      },
      required: ["sku"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ sku }) => productBySku(sku),
  },

  get_delivery_and_returns: {
    description:
      "What delivery costs and how long it takes to each of the four zones the shop ships to, "
      + "the free-delivery thresholds, and where the full shipping and returns policies are.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => ({
      delivery: DELIVERY,
      // These three lines are the returns page in miniature and MUST say what it
      // says. They once said "30 days" and "the customer pays postage" while the
      // page said 60 days and free postage for three years, so a visitor who
      // asked the assistant was told something the shop's own policy contradicts
      // — the one failure mode a grounded demo cannot have. Source of truth:
      // sites/woo/public/returns.md, served at /returns/ and /returns.md.
      returns: {
        window: "60 days from delivery, for any reason — unworn, unwashed and in resaleable condition, with tags where it had them",
        statutory: "The EU right of withdrawal is 14 days; the other 46 are Fernweh's own and are not a legal obligation.",
        postage: "A prepaid label for Germany and the EU; elsewhere the return postage is refunded once the parcel arrives.",
        refunds: "Back to the original payment method within three working days of the parcel arriving; cards take two to five days more to show it.",
        repairs: "Anything Fernweh made is repaired for as long as the parts exist — free including postage for the first three years, at cost after that (typically €15–€40), quoted before any work starts.",
        guarantee: "Three years against manufacturing fault from delivery, on everything except ink and paper refills.",
        page: "https://woo.demo.busymate.ai/returns/",
      },
      categories: (await categories()).categories,
    }),
  },

  list_my_orders: {
    description:
      "Every order on the signed-in customer's account — number, status, what was in it and the "
      + "total. Answers only for the customer the caller's signed proof identifies; it cannot be "
      + "pointed at anybody else.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "delegated",
    handler: (_args, { customerId }) => listOrders(customerId),
  },

  get_order_status: {
    description:
      "Where one of the signed-in customer's orders has got to, what it contains and what the "
      + "status actually means. With no order number it answers about the most recent one. "
      + "Call this the moment an order is asked about — never ask for the order number in prose "
      + "first: call it with whatever you already have and the action card in the chat collects "
      + "the rest as a field the customer fills in.",
    inputSchema: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "The order number as it appears on the account, e.g. 52" },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "delegated",
    formCard: {
      title: "Check an order",
      intro: "Which order would you like me to look up?",
      submitLabel: "Check it",
      resultKeys: ["status", "statusMeans", "placed", "total", "delivery", "detail"],
      fields: [
        {
          name: "orderNumber", label: "Order number", type: "text", placeholder: "52",
          help: "Leave it empty and I will take the most recent order on the account.",
        },
      ],
    },
    handler: ({ orderNumber }, { customerId }) => orderStatus(customerId, orderNumber),
  },

  start_return: {
    description:
      "Open a return for one item on one of the signed-in customer's orders. Writes the return "
      + "reference onto the real order as a customer-visible note and reports it back. Only a "
      + "paid or completed order can be returned. "
      + "Call this as soon as a return is mentioned — never ask for the order number, the item or "
      + "the reason in prose first: call it with whatever you already have and the action card in "
      + "the chat collects the rest as fields the customer fills in and submits.",
    // Nothing is REQUIRED, deliberately. A required argument the model does not
    // have is an argument it asks for in a paragraph; an optional one lets it
    // call the tool immediately, and the action card asks for the rest as fields
    // with a submit button. The handler still refuses an incomplete return — the
    // check belongs where the write happens, not in a schema that changes how
    // the conversation feels.
    inputSchema: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "The order the item came in" },
        item: { type: "string", description: "The SKU or name of the item going back" },
        reason: { type: "string", description: "Why it is going back, in the customer's own words" },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    accessHint: "delegated",
    formCard: {
      title: "Start a return",
      intro: "Tell me which order it came in, what is going back and why.",
      submitLabel: "Open the return",
      resultKeys: ["reference", "order", "item", "status", "detail", "next"],
      fields: [
        { name: "orderNumber", label: "Order number", type: "text", required: true, placeholder: "53" },
        { name: "item", label: "What is going back", type: "text", required: true, placeholder: "FW-ML-SK or “merino socks”" },
        { name: "reason", label: "Why", type: "textarea", placeholder: "Too small / arrived marked / changed my mind" },
      ],
    },
    handler: (args, { customerId }) => startReturn(customerId, args ?? {}),
  },
};

/** The table the server dispatches on — same object, named for what it is. */
export const TOOL_TABLE = TOOL_SCHEMA;
