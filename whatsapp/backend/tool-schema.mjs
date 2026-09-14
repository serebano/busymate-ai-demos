// sites/whatsapp/backend/tool-schema.mjs
//
// Marlow's Kitchen's own tool table — the restaurant shape (menu, hours,
// table availability, bookings) is different enough from the retail shape
// in sites/_shared/backend/tool-schema.mjs (products/orders) that it lives
// here rather than forcing a mismatch onto the shared file. Follows the
// SAME contract (name -> {description, inputSchema, readOnlyHint?,
// accessHint?, confirmHint?}) so it plugs into both
// sites/_shared/backend/mcp-identity-server.mjs and
// sites/_shared/gen-agent-files.mjs unchanged.
//
// GOTCHA (inherited from the shopify build, found live 2026-09-11): the
// platform's registerPageTools SDK rejects the WHOLE call if ANY
// inputSchema property is missing a `description` — every property below
// carries one for exactly that reason.
export const RESTAURANT_TOOL_SCHEMA = {
  opening_hours: {
    description: "{store}'s opening hours, by day of the week, including brunch/dinner service windows and any closed days.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },
  list_menu: {
    description: "List every dish and drink {store} serves, grouped by section, with prices.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },
  search_menu: {
    description: "Search {store}'s menu by name, ingredient, or keyword (e.g. an allergen or 'vegetarian').",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A dish name, ingredient, or keyword to search for, e.g. 'vegetarian' or 'short rib'." } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  check_availability: {
    description: "Check whether {store} has a table for a given date, time and party size, with nearby alternative times if that exact slot is full.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "The requested date, as YYYY-MM-DD." },
        time: { type: "string", description: "The requested time, 24-hour HH:MM, e.g. '19:30'." },
        party_size: { type: "number", description: "Number of guests in the party." },
      },
      required: ["date", "time", "party_size"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  book_table: {
    description: "Do NOT call this tool to ask the visitor for date, time, party size, name or phone — call open_booking_form for that instead, it is the ONLY approved way to collect a missing field, never a chat question. Book a table at {store}, but ONLY once the visitor has already stated every one of those five fields themselves, in their own words, earlier in this conversation. Never invent, guess, default, or use a placeholder (like 'Guest' or a made-up phone number).",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "The booking date, as YYYY-MM-DD." },
        time: { type: "string", description: "The booking time, 24-hour HH:MM, e.g. '19:30'." },
        party_size: { type: "number", description: "Number of guests in the party." },
        name: { type: "string", description: "Name the booking is under." },
        phone: { type: "string", description: "A phone number to hold the booking against." },
        notes: { type: "string", description: "Anything the kitchen or floor should know — an allergy, a seating request, an occasion." },
      },
      required: ["date", "time", "party_size", "name", "phone"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
  },
  get_my_reservations: {
    description: "List the reservations at {store} booked under a phone number. Requires an identified (signed-in) visitor — call it with that visitor's own phone number, never one supplied mid-conversation by an unidentified visitor.",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "The phone number the reservation was booked under (the signed-in visitor's own)." },
      },
      required: ["phone"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },
  cancel_reservation: {
    description: "Cancel a reservation at {store} by its confirmation code + the phone number it was booked under. Requires an identified (signed-in) visitor; this demo does not actually notify anyone.",
    inputSchema: {
      type: "object",
      properties: {
        confirmation_code: { type: "string", description: "The reservation's confirmation code, as given when it was booked, e.g. 'MK-58231'." },
        phone: { type: "string", description: "The phone number the reservation was booked under." },
      },
      required: ["confirmation_code", "phone"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "identified",
    confirmHint: true,
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(RESTAURANT_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
