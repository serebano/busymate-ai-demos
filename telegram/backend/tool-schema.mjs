// sites/telegram/backend/tool-schema.mjs
//
// Nomad Circuits' own tool table — a travel-tech shop's shape (catalogue,
// repairs, orders) is different enough from the restaurant/retail shapes
// elsewhere in this repo that it lives here rather than forcing a mismatch
// onto a shared file. Follows the SAME contract (name -> {description,
// inputSchema, readOnlyHint?, accessHint?, confirmHint?, formCard?}) so it
// plugs into both sites/_shared/backend/mcp-identity-server.mjs and
// sites/_shared/gen-agent-files.mjs unchanged.
//
// GOTCHA (inherited from the shopify build, found live 2026-09-11): the
// platform's registerPageTools SDK rejects the WHOLE call if ANY
// inputSchema property is missing a `description` — every property below
// carries one for exactly that reason.
//
// Anything that needs structured details from a visitor (placing an order,
// booking a repair, tracking one, leaving a message) carries a `formCard` —
// the shared server serves it as an MCP resource and the chat widget mounts
// it as an inline form instead of the assistant asking one field at a time
// in prose (see sites/_shared/ui/form-card.mjs and the README's "Asking
// with a form, not a paragraph").
export const SHOP_TOOL_SCHEMA = {
  opening_hours: {
    description: "{store}'s opening hours for walk-in orders and repair drop-off, by day of the week, including any closed days.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  list_catalog: {
    description: "List everything {store} sells and repairs, grouped by category, with prices and SKUs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  search_catalog: {
    description: "Search {store}'s catalogue and repair services by name, category or keyword (e.g. 'charging', 'earbuds', 'screen repair').",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A product name, category, or keyword to search for, e.g. 'power bank' or 'screen repair'." } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  place_order: {
    description: "Do NOT call this to ask the visitor for the item, quantity, name, email or shipping country — calling it with whatever is already known IS how the order form opens, never a chat question for a missing field. Places an order at {store} for one catalogue item and reports the order number and status.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU of the item to order, e.g. 'NC-PWR-20K'. Leave blank if not yet known — the form lets the visitor pick." },
        quantity: { type: "number", description: "How many of that item, default 1." },
        name: { type: "string", description: "Name the order ships to." },
        email: { type: "string", description: "Email address for the order confirmation." },
        country: { type: "string", description: "Shipping country." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Place an order",
      intro: "Pick an item and where it should ship.",
      submitLabel: "Place order",
      resultKeys: ["order_number", "status", "total", "eta"],
      fields: [
        { name: "sku", label: "Item", type: "select", required: true,
          options: [
            { value: "NC-PWR-20K", label: "Voyager 20K Power Bank — $49" },
            { value: "NC-SOL-14", label: "Solstice Solar Panel — $39" },
            { value: "NC-ADP-GL", label: "Everywhere Adapter — $24" },
            { value: "NC-HSP-5G", label: "PocketLink 5G Hotspot — $89" },
            { value: "NC-EAR-EB", label: "Everyday EchoBuds — $69" },
            { value: "NC-TRN-40", label: "Lingua Mini Translator — $99" },
            { value: "NC-CAM-4K", label: "TrailCam 4K — $159" },
            { value: "NC-DRN-MC", label: "Skyline Micro Drone — $199" },
            { value: "NC-RDR-WP", label: "InkPage Reader — $129" },
          ] },
        { name: "quantity", label: "Quantity", type: "number", required: true, placeholder: "1" },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "Priya Fenwick" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
        { name: "country", label: "Shipping country", type: "text", required: true, placeholder: "Portugal" },
      ],
    },
  },

  book_repair: {
    description: "Do NOT call this to ask the visitor for the device, issue, name, contact email or preferred slot — calling it with whatever is already known IS how the repair form opens, never a chat question for a missing field. Books a repair drop-off slot at {store} and reports the ticket number.",
    inputSchema: {
      type: "object",
      properties: {
        device: { type: "string", description: "The device coming in, e.g. 'iPhone-style phone, cracked screen'." },
        issue: { type: "string", description: "What is wrong with it." },
        name: { type: "string", description: "Name the repair ticket is under." },
        email: { type: "string", description: "Email address to notify when it's ready." },
        preferred_date: { type: "string", description: "Preferred drop-off date, YYYY-MM-DD." },
        preferred_time: { type: "string", description: "Preferred drop-off time, 24-hour HH:MM." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Book a repair",
      intro: "Tell us what's coming in and when works for you.",
      submitLabel: "Book repair",
      resultKeys: ["ticket_number", "status", "drop_off"],
      fields: [
        { name: "device", label: "Device", type: "text", required: true, placeholder: "Phone, tablet, earbuds…" },
        { name: "issue", label: "What's wrong", type: "textarea", required: true, placeholder: "Cracked screen, battery drains fast, won't charge…" },
        { name: "name", label: "Name", type: "text", required: true, placeholder: "Priya Fenwick" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
        { name: "preferred_date", label: "Preferred date", type: "date", required: true },
        { name: "preferred_time", label: "Preferred time", type: "time", required: true },
      ],
    },
  },

  track_order: {
    description: "Look up the status of an order OR a repair ticket at {store} by its number and the email it was placed under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.",
    inputSchema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "The order number (e.g. 'NC-48213') or repair ticket number (e.g. 'NC-R-1042')." },
        email: { type: "string", description: "The email it was placed under." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    formCard: {
      title: "Track an order or repair",
      intro: "Which order or repair ticket would you like me to look up?",
      submitLabel: "Check it",
      resultKeys: ["kind", "status", "carrier", "tracking", "eta", "items", "device"],
      fields: [
        { name: "reference", label: "Order or ticket number", type: "text", required: true, placeholder: "NC-48213 or NC-R-1042" },
        { name: "email", label: "Email it was placed under", type: "email", required: true, placeholder: "you@example.com" },
      ],
    },
  },

  get_my_account: {
    description: "Every order and repair ticket belonging to the signed-in customer. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "The signed-in visitor's own email." } },
      required: ["email"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },

  contact_us: {
    description: "Leave a message for a person at {store} — a question the assistant cannot answer, a warranty dispute, or a bulk order. Collects a name, an email address and the message itself.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Who is writing." },
        email: { type: "string", description: "Where the shop should reply." },
        message: { type: "string", description: "What they want to say." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    formCard: {
      title: "Message Nomad Circuits",
      intro: "Leave your details and a person will pick this up.",
      submitLabel: "Send message",
      resultKeys: ["reference", "receivedAt", "detail"],
      fields: [
        { name: "name", label: "Your name", type: "text", required: true, placeholder: "Priya Fenwick" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
        { name: "message", label: "Message", type: "textarea", required: true, placeholder: "What would you like us to look at?" },
      ],
    },
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(SHOP_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
