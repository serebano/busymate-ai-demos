// sites/webflow/backend/tools.mjs
//
// Aldercroft Studio's own MCP tool table. Every read reads the site's OWN
// live published bytes (webflowContent.mjs) — Webflow's Starter plan has no
// Content API to read instead, and this backend keeps no second copy of the
// page to drift from it. `request_consultation` is the one consequential
// action — it records an intent (this demo never actually books a real
// appointment), same shape as wordpress's `request_consultation`.
import { fetchSectionText, fetchAllSections } from "./webflowContent.mjs";
import { demoCustomer } from "./store.mjs";

export const TOOL_TABLE = {
  list_services: {
    description: "Aldercroft Studio's real estate and property services, read live from the studio's own published site.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => {
      const text = await fetchSectionText("service").catch(() => null);
      if (!text) return { error: "unavailable", detail: "Could not reach the studio's site right now." };
      return { services: text };
    },
  },

  list_properties: {
    description: "The properties Aldercroft Studio is currently featuring, read live from the studio's own published site.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => {
      const text = await fetchSectionText("properties").catch(() => null);
      if (!text) return { error: "unavailable", detail: "Could not reach the studio's site right now." };
      return { properties: text };
    },
  },

  search_content: {
    description: "Search Aldercroft Studio's own published page (about, properties, services, testimonials, contact) for a query — reads the site's own live bytes, so it can never drift from what's actually shown.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to search for, e.g. 'valuation' or 'apartment'" } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: async ({ query }) => {
      const q = String(query ?? "").trim().toLowerCase();
      if (!q) return { error: "empty_query", detail: "Tell me what to search for." };
      const sections = await fetchAllSections().catch(() => null);
      if (!sections) return { error: "unavailable", detail: "Could not reach the studio's site right now." };
      const results = Object.entries(sections)
        .filter(([, text]) => text && text.toLowerCase().includes(q))
        .map(([section, text]) => ({ section, excerpt: text.slice(0, 220) }));
      return { query: q, results };
    },
  },

  get_studio_info: {
    description: "Aldercroft Studio's contact details and office location, read live from the studio's own published site.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => {
      const text = await fetchSectionText("contact").catch(() => null);
      if (!text) return { error: "unavailable", detail: "Could not reach the studio's site right now." };
      return { contact: text };
    },
  },

  request_consultation: {
    description: "Request a property consultation with Aldercroft Studio. Call this as soon as the visitor says they want a consultation or want to talk to someone, even before every detail is confirmed.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The visitor's name" },
        email: { type: "string", description: "Where the studio should follow up" },
        interest: { type: "string", description: "What property or service they're asking about" },
      },
      required: ["email"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "public",
    handler: async ({ name, email, interest }) => {
      const clean = String(email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "invalid_email", detail: "That doesn't look like a valid email address." };
      // The demo never actually contacts a real visitor — it records the
      // intent, the same way wordpress's request_consultation does.
      return {
        confirmed: true,
        name: name || null,
        email: clean,
        interest: interest || null,
        detail: "Noted — someone from Aldercroft Studio will follow up about this.",
      };
    },
  },

  who_is_signed_in: {
    description: "Who is signed in as an Aldercroft Studio client in this browser, if anyone.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "identified",
    handler: async (_args, ctx) => {
      if (!ctx?.customerId) return { signedIn: false, detail: "Nobody is signed in in this browser." };
      return { signedIn: true, name: demoCustomer.name, project: demoCustomer.project };
    },
  },
};
