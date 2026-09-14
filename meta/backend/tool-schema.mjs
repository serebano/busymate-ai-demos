// sites/meta/backend/tool-schema.mjs
//
// Sol & Salt's own tool table — a swim-and-resort label's shape (a seasonal
// collection, a body-measurement size guide, a shipping/returns policy, an
// order book and a returns desk) is different enough from the generic retail
// set in sites/_shared/backend/tool-schema.mjs that it lives here. It follows
// the SAME contract (name -> {description, inputSchema, readOnlyHint?,
// accessHint?, confirmHint?, formCard?}) so it plugs into
// sites/_shared/backend/mcp-identity-server.mjs and
// sites/_shared/gen-agent-files.mjs unchanged.
//
// GOTCHA (found live on the shopify build, 2026-09-11): the platform's
// registerPageTools SDK rejects the WHOLE call if ANY inputSchema property
// lacks a `description` — every property below carries one for that reason.
//
// start_return carries the `formCard`: a return needs an order number, the
// item and a reason, and asking for three things one at a time in a DM is a
// worse interface than one card with three fields and a button.
export const SWIMWEAR_TOOL_SCHEMA = {
  list_collection: {
    description: "The whole {store} collection — every swim and resort piece in stock, with its code, fabric, size range, colourways and price. Optionally narrowed to one category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Narrow the list: 'swim' (suits, tops, bottoms, rash guard, board shorts), 'resort' (linen, kaftan, cover-ups) or 'all' (the default)." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  search_products: {
    description: "Search the {store} collection by name, code, fabric, colourway or a word for what it is for ('laps', 'long swim', 'cover-up', 'UPF', 'high waist'). Returns the matching pieces in full.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A piece name, code, fabric, colourway or keyword, e.g. 'one-piece', 'linen', 'UPF' or 'SS-107'." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  size_guide: {
    description: "{store}'s size chart in centimetres and inches, and — when body measurements are given — the size this label would actually put someone in for a named piece, with the fit note that goes with it. Always call this before suggesting a size; never guess one.",
    inputSchema: {
      type: "object",
      properties: {
        item: { type: "string", description: "The piece being sized, by name or code, e.g. 'Tidal Scoop-Back One-Piece' or 'SS-109'. Leave blank for the plain chart." },
        bust_cm: { type: "number", description: "Bust or chest measurement in centimetres, if the customer has given one." },
        waist_cm: { type: "number", description: "Natural waist measurement in centimetres, if the customer has given one." },
        hip_cm: { type: "number", description: "Fullest hip measurement in centimetres, if the customer has given one." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  shipping_and_returns: {
    description: "{store}'s delivery times, costs and duty handling, plus the returns and exchange policy — the window, what makes a piece returnable, and how a refund is paid back.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Where the parcel is going: 'domestic' (within the United States), 'canada', 'europe', 'rest-of-world', or blank for everything." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  start_return: {
    description: "Do NOT ask the customer for the order number, the item or the reason in the conversation — calling this tool with whatever is already known IS how the return card opens, and it is the only approved way to collect a missing one. Starts a return or exchange at {store} and reports the return number, the window, and what happens to the refund. Never invent, guess or default an order number, an item or a reason.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The order the piece came in, e.g. 'SS-31082'. Leave blank if not yet known — the card asks for it." },
        item: { type: "string", description: "Which piece is going back, by name or code." },
        reason: { type: "string", description: "Why it is going back: 'too-small', 'too-large', 'not-as-pictured', 'faulty', 'changed-mind' or 'exchange-size'." },
        note: { type: "string", description: "Anything the returns desk should know — the size wanted in an exchange, or what went wrong." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Start a return",
      intro: "Three things and the label is on its way to your inbox.",
      submitLabel: "Start the return",
      resultKeys: ["return_number", "status", "window_closes", "refund", "next_step"],
      fields: [
        { name: "order_number", label: "Order number", type: "text", required: true, placeholder: "SS-31082" },
        { name: "item", label: "Which piece", type: "text", required: true, placeholder: "Tidal Scoop-Back One-Piece" },
        { name: "reason", label: "Reason", type: "select", required: true,
          options: [
            { value: "too-small", label: "Too small" },
            { value: "too-large", label: "Too large" },
            { value: "exchange-size", label: "Right piece, wrong size — exchange" },
            { value: "not-as-pictured", label: "Not what I expected" },
            { value: "faulty", label: "Something is wrong with it" },
            { value: "changed-mind", label: "Changed my mind" },
          ] },
        { name: "note", label: "Anything else", type: "textarea", required: false, placeholder: "Happy to swap it for a size up in Sea." },
      ],
    },
  },

  get_my_orders: {
    description: "Every order belonging to the signed-in customer at {store} — what was in it, what it cost, where it is, and whether it can still be returned or cancelled. Requires an identified (signed-in) visitor: call it with that visitor's own email from context, never one typed mid-conversation by an unidentified visitor.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "The signed-in visitor's own email address." },
      },
      required: ["email"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },

  cancel_order: {
    description: "Cancel a {store} order that has NOT been dispatched yet, for the signed-in customer. Requires an identified (signed-in) visitor and their explicit confirmation first; an order already on its way has to be returned instead, not cancelled.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The order to cancel, e.g. 'SS-31460'." },
        email: { type: "string", description: "The signed-in visitor's own email address, the one the order was placed under." },
      },
      required: ["order_number", "email"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "identified",
    confirmHint: true,
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(SWIMWEAR_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
