// sites/telegram/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext
// (see the inline script at the bottom of index.html) — kept here too, as
// plain data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. If a
// tool changes on the page, change it here in the SAME commit.
export const TOOL_SPECS = [
  {
    name: "opening_hours",
    description: "Nomad Circuits's opening hours for walk-in orders and repair drop-off, by day of the week, including any closed days.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_catalog",
    description: "List everything Nomad Circuits sells and repairs, grouped by category, with prices and SKUs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "search_catalog",
    description: "Search Nomad Circuits's catalogue and repair services by name, category or keyword (e.g. 'charging', 'earbuds', 'screen repair').",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A product name, category, or keyword to search for, e.g. 'power bank' or 'screen repair'." } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "place_order",
    description: "Places an order at Nomad Circuits for one catalogue item and reports the order number and status. Call it with whatever is already known — it opens the order form for anything missing.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "The SKU of the item to order, e.g. 'NC-PWR-20K'." },
        quantity: { type: "number", description: "How many of that item, default 1." },
        name: { type: "string", description: "Name the order ships to." },
        email: { type: "string", description: "Email address for the order confirmation." },
        country: { type: "string", description: "Shipping country." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "book_repair",
    description: "Books a repair drop-off slot at Nomad Circuits and reports the ticket number. Call it with whatever is already known — it opens the booking form for anything missing.",
    inputSchema: {
      type: "object",
      properties: {
        device: { type: "string", description: "The device coming in, e.g. 'phone, cracked screen'." },
        issue: { type: "string", description: "What is wrong with it." },
        name: { type: "string", description: "Name the repair ticket is under." },
        email: { type: "string", description: "Email address to notify when it's ready." },
        preferred_date: { type: "string", description: "Preferred drop-off date, YYYY-MM-DD." },
        preferred_time: { type: "string", description: "Preferred drop-off time, 24-hour HH:MM." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "track_order",
    description: "Look up the status of an order or a repair ticket at Nomad Circuits by its number and the email it was placed under.",
    inputSchema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "The order number (e.g. 'NC-48213') or repair ticket number (e.g. 'NC-R-1042')." },
        email: { type: "string", description: "The email it was placed under." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_my_account",
    description: "Every order and repair ticket belonging to the signed-in customer.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "The signed-in visitor's own email." } },
      required: ["email"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "contact_us",
    description: "Leave a message for a person at Nomad Circuits. Collects a name, an email address and the message itself.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Who is writing." },
        email: { type: "string", description: "Where the shop should reply." },
        message: { type: "string", description: "What they want to say." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
];
