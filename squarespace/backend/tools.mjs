// sites/squarespace/backend/tools.mjs
//
// What Quiet Pines Yoga's MCP server offers, and nothing else.
//
// get_page/search_site/list_booking_options read the studio's own live,
// published Squarespace pages and always work (public). book_a_session is
// `accessHint: "delegated"` — the shared server only puts it on
// `tools/list` once a verified actor token (or the demo's own signed-in
// session) can identify the caller, and refuses it with a sign-in card
// until then. All four read Squarespace LIVE
// (sites/squarespace/backend/squarespace.mjs) — nothing here is hardcoded
// demo data.
import {
  allPages, pageByTitle, searchSite, bookingOptions,
} from "./squarespace.mjs";

export const TOOL_SCHEMA = {
  get_page: {
    description:
      "Read one live page of the Quiet Pines Yoga site — Home, About, Services, Appointments or "
      + "Contact — exactly as it is published right now.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", description: "Home, About, Services, Appointments or Contact" } },
      required: ["title"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ title }) => pageByTitle(title),
  },

  search_site: {
    description:
      "Search every live page of the Quiet Pines Yoga site for a word or phrase and return the "
      + "pages that mention it, with their live text.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to look for, e.g. 'therapeutic' or 'consultation'" } },
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ query }) => searchSite(query),
  },

  list_booking_options: {
    description:
      "The studio session options currently listed on the live Appointments page — name, "
      + "duration and price, read fresh off the studio's own booking list.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: () => bookingOptions(),
  },

  book_a_session: {
    description:
      "Start booking a studio session for the signed-in visitor. Answers only for the visitor "
      + "the caller's signed proof identifies — call this the moment a booking is asked for, "
      + "never ask for the details in prose first: call it with whatever you already have and "
      + "the action card in the chat collects the rest.",
    inputSchema: {
      type: "object",
      properties: {
        option: { type: "string", description: "Which session, e.g. 'Free Consultation' or 'Basic Service'" },
        preferredTime: { type: "string", description: "A day/time the visitor would like, in their own words" },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "delegated",
    formCard: {
      title: "Book a studio session",
      intro: "Which session would you like, and when?",
      submitLabel: "Request this time",
      resultKeys: ["confirmed", "detail"],
      fields: [
        { name: "option", label: "Session", type: "text", placeholder: "Free Consultation" },
        { name: "preferredTime", label: "Preferred time", type: "text", placeholder: "Tuesday morning" },
      ],
    },
    handler: async ({ option, preferredTime }, { customerId }) => ({
      confirmed: false,
      detail: `This is a demonstration studio: no real booking is placed. ${customerId ?? "the signed-in visitor"} `
        + `asked for "${option ?? "a session"}"${preferredTime ? ` around ${preferredTime}` : ""} — a real deployment `
        + "would call the studio's own Scheduling API here.",
    }),
  },
};

export const TOOL_TABLE = TOOL_SCHEMA;
