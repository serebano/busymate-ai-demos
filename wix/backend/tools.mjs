// sites/wix/backend/tools.mjs
//
// Wren & Oat Bakery's own MCP tool table. `list_menu`, `get_hours`, and
// `get_story` read the curated FACTS in wixContent.mjs, authored to match
// the real published site (see that file's header for why this demo can't
// regex-scrape Wix's client-rendered warmup payload the way webflow/ghost
// scrape their own clean server-rendered HTML). `site_status` proves the
// real site is actually up right now — a live fetch, not a cached claim.
// `place_order` is the one consequential action — it records an intent
// (this demo never actually bakes or ships anything), same shape as
// webflow's `request_consultation`.
import { FACTS, fetchLiveMeta } from "./wixContent.mjs";
import { demoCustomer } from "./store.mjs";

export const TOOL_TABLE = {
  list_menu: {
    description: "Wren & Oat Bakery's menu — bread, pastry, and coffee — as published on the bakery's own site.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => ({ menu: FACTS.menu }),
  },

  get_hours: {
    description: "Wren & Oat Bakery's opening hours.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => ({ hours: FACTS.hours }),
  },

  get_story: {
    description: "Wren & Oat Bakery's story and what makes it different (small-batch, from-scratch, slow-fermented sourdough).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => ({ name: FACTS.name, tagline: FACTS.tagline, story: FACTS.story }),
  },

  search_menu: {
    description: "Search Wren & Oat Bakery's menu for an item or category, e.g. 'croissant' or 'coffee'.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to search for" } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: async ({ query }) => {
      const q = String(query ?? "").trim().toLowerCase();
      if (!q) return { error: "empty_query", detail: "Tell me what to search for." };
      const results = FACTS.menu
        .map((section) => ({
          category: section.category,
          items: section.items.filter((item) => item.toLowerCase().includes(q)),
        }))
        .filter((section) => section.items.length || section.category.toLowerCase().includes(q));
      return { query: q, results };
    },
  },

  site_status: {
    description: "Confirms the real Wix-hosted site is live right now (fetches it fresh) and returns its published title.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => {
      const meta = await fetchLiveMeta("/").catch(() => null);
      if (!meta || !meta.ok) return { error: "unavailable", detail: "Could not reach the bakery's site right now." };
      return meta;
    },
  },

  place_order: {
    description: "Place a pickup order with Wren & Oat Bakery. Call this as soon as the visitor names what they want, even before every detail is confirmed.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The visitor's name" },
        email: { type: "string", description: "Where the bakery should confirm the order" },
        items: { type: "string", description: "What they want to order" },
      },
      required: ["email", "items"],
      additionalProperties: false,
    },
    accessHint: "public",
    confirmHint: true,
    handler: async ({ name, email, items }) => {
      const clean = String(email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "invalid_email", detail: "That doesn't look like a valid email address." };
      if (!items) return { error: "missing_items", detail: "Tell me what you'd like to order." };
      // The demo never actually bakes or ships anything — it records the
      // intent, the same way webflow's request_consultation does.
      return {
        ok: true,
        reference: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
        message: `Thanks${name ? ` ${name}` : ""} — we've noted your order for "${items}". This demo doesn't actually bake or ship anything.`,
      };
    },
  },

  who_is_signed_in: {
    description: "Who is signed in as a Wren & Oat Bakery customer in this browser, if anyone.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "identified",
    handler: async (_args, ctx) => {
      if (!ctx?.customerId) return { signedIn: false, detail: "Nobody is signed in in this browser." };
      return { signedIn: true, name: demoCustomer.name, order: demoCustomer.order };
    },
  },
};
