// sites/web/backend/tools.mjs
//
// Northwind Coffee's own MCP tool table: what the store lets an assistant do
// over HTTPS, and the code behind each one.
//
// Access is deliberately split. The catalogue and the policies are `public` —
// anyone, signed in or not, can ask what Northwind sells and what delivery
// costs. Anything about a customer's own order book is `delegated`: the shared
// server only calls those handlers after the platform's actor token verifies,
// and hands the customer in as `ctx.customerId`. That is why no tool here takes
// a customer id, an email or an account number as an argument — the model
// cannot ask about somebody else, because there is no argument for it to try.
import {
  getPolicy, getProduct, leaveMessage, orderFor, ordersFor, policyNames,
  searchProducts, startReturn, store,
} from "./store.mjs";

export const TOOL_TABLE = {
  search_coffee: {
    description:
      "Search Northwind Coffee's range by name, origin, roast, tasting note or use "
      + "(espresso, filter, decaf, gift). Returns price, size and what is in stock.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the customer is after, e.g. 'fruity filter coffee' or 'decaf'" },
        decafOnly: { type: "boolean", description: "Limit the results to decaffeinated coffee" },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ query, decafOnly }) => ({
      currency: store.currency,
      matches: searchProducts(query ?? "", { decaf: decafOnly === true ? true : null }),
    }),
  },

  get_coffee: {
    description: "Full detail for one of Northwind's coffees, by SKU or by name.",
    inputSchema: {
      type: "object",
      properties: { sku: { type: "string", description: "The SKU or the product name" } },
      required: ["sku"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ sku }) => {
      const product = getProduct(sku);
      return product ? { product } : { error: "not_found", sku };
    },
  },

  store_policy: {
    description: `Northwind's own wording for one of its policies: ${policyNames().join(", ")}.`,
    inputSchema: {
      type: "object",
      properties: { policy: { type: "string", enum: policyNames() } },
      required: ["policy"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ policy }) => {
      const text = getPolicy(policy);
      return text ? { policy, text } : { error: "unknown_policy", known: policyNames() };
    },
  },

  contact_northwind: {
    description:
      "Leave a message for a person at Northwind — a question the assistant cannot answer, "
      + "a problem with an order, or anything that needs a human. Collects a name, an email "
      + "address and the message itself. This is NOT the tool for 'where is my order' — call "
      + "get_order_status for that, even signed out (it is what shows the sign-in card). "
      + "The email is the VISITOR'S OWN real address: it must come from something they typed "
      + "in this conversation. Never invent one, and never fill it with a placeholder "
      + "(example.com, test@…, noreply@…, user@…) just to satisfy this schema — if the visitor "
      + "has not given an email, ask them for it (the form card does this) instead of calling "
      + "this tool with a guess. The server refuses placeholder-looking addresses.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Who is writing — the visitor's own name, never invented" },
        email: {
          type: "string",
          format: "email",
          minLength: 6,
          description: "The visitor's own real email, exactly as they gave it — never a placeholder or invented address",
        },
        message: { type: "string", description: "What they want to say" },
        orderNumber: { type: "string", description: "The order this is about, if any" },
      },
      required: ["name", "email", "message"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "public",
    // Asking for three separate details in prose is a worse interface than a
    // form, so this tool carries one and the host mounts it in the chat.
    formCard: {
      title: "Message Northwind",
      intro: "Leave your details and a person will pick this up.",
      submitLabel: "Send message",
      resultKeys: ["reference", "receivedAt", "detail"],
      fields: [
        { name: "name", label: "Your name", type: "text", required: true, placeholder: "Alex Rivera" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
        { name: "orderNumber", label: "Order number", type: "text", placeholder: "NW-10432",
          help: "Only if this is about an order." },
        { name: "message", label: "Message", type: "textarea", required: true,
          placeholder: "What would you like us to look at?" },
      ],
    },
    handler: (args) => leaveMessage(args ?? {}),
  },

  list_my_orders: {
    description:
      "Every order belonging to the signed-in customer — number, status, carrier, "
      + "tracking and contents. Answers only for the customer the caller's proof identifies.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "delegated",
    handler: (_args, { customerId }) => ({ orders: ordersFor(customerId) }),
  },

  get_order_status: {
    description:
      "THE tool for any order or delivery question — 'where is my order', tracking, ETA. "
      + "Call this FIRST for that ask, even when the visitor is signed out: a not-signed-in "
      + "refusal is the expected, correct outcome and is what shows the sign-in card. Never "
      + "substitute contact_northwind for this just because it is signed out. Once signed in, "
      + "returns where one of the customer's orders is right now, with carrier, "
      + "tracking number and the expected delivery date.",
    inputSchema: {
      type: "object",
      properties: { orderNumber: { type: "string", description: "The order number, e.g. NW-10432" } },
      required: ["orderNumber"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "delegated",
    formCard: {
      title: "Check an order",
      intro: "Which order would you like me to look up?",
      submitLabel: "Check it",
      resultKeys: ["status", "carrier", "tracking", "eta", "shipTo"],
      fields: [
        { name: "orderNumber", label: "Order number", type: "text", required: true, placeholder: "NW-10432",
          help: "It is on the confirmation email and on the bag's label." },
      ],
    },
    handler: ({ orderNumber }, { customerId }) => {
      const order = orderFor(customerId, orderNumber);
      return order
        ? { order }
        : { error: "not_found", detail: "I cannot find an order with that number on this account." };
    },
  },

  start_return: {
    description:
      "Open a return for one item on one of the signed-in customer's orders and report "
      + "the refund and what happens next. This changes something, so it is confirmed first.",
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
    accessHint: "delegated",
    confirmHint: true,
    formCard: {
      title: "Start a return",
      intro: "Tell me which bag is going back and why.",
      submitLabel: "Open the return",
      resultKeys: ["id", "item", "refund", "status", "instructions", "detail"],
      fields: [
        { name: "orderNumber", label: "Order number", type: "text", required: true, placeholder: "NW-10432" },
        { name: "sku", label: "Which coffee", type: "text", required: true, placeholder: "Ethiopia Yirgacheffe" },
        { name: "reason", label: "What went wrong", type: "textarea",
          placeholder: "Too light for me / arrived split / wrong beans" },
      ],
    },
    handler: (args, { customerId }) => startReturn(customerId, args),
  },
};

/** The same table without the handlers — what the generator publishes. */
export const TOOL_SCHEMA = Object.fromEntries(
  Object.entries(TOOL_TABLE).map(([name, { handler, ...rest }]) => [name, rest]),
);
