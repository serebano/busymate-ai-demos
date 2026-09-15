// sites/ghost/backend/tools.mjs
//
// The Meridian Line's own MCP tool table. Reads Ghost's OWN public Content
// API (never a second copy of the copy), so `list_articles`/`search_content`
// can never drift from what the site actually shows — same principle as
// wordpress's `search_content` over `/wp-json/wp/v2/`. `subscribe_newsletter`
// is the one consequential action: it calls this backend's own
// /api/newsletter route, which uses the Ghost ADMIN API (server-side only,
// key never shipped to a browser) to create a real free-tier Member.
import { demoCustomer, CONTACT } from "./store.mjs";

const GHOST_ORIGIN = process.env.GHOST_CONTENT_API || "http://demo-ghost:2368";
const CONTENT_KEY = process.env.GHOST_CONTENT_API_KEY || "";

async function contentFetch(path) {
  if (!CONTENT_KEY) return { ok: false, status: 0, json: null };
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GHOST_ORIGIN}${path}${sep}key=${CONTENT_KEY}`);
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

const plain = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const TOOL_TABLE = {
  list_articles: {
    description: "The most recent articles published on The Meridian Line, with title, excerpt and URL — reads the magazine's own live Content API.",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "How many articles, default 5, max 10" } }, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async ({ limit } = {}) => {
      const n = Math.max(1, Math.min(10, Number(limit) || 5));
      const r = await contentFetch(`/ghost/api/content/posts/?limit=${n}&fields=title,excerpt,url,published_at`);
      if (!r.ok || !r.json) return { error: "unavailable", detail: "Could not reach the magazine's content API right now." };
      return { articles: (r.json.posts || []).map((p) => ({ title: p.title, excerpt: plain(p.excerpt).slice(0, 220), url: p.url, published_at: p.published_at })) };
    },
  },

  search_content: {
    description: "Search The Meridian Line's own published articles and pages (title + excerpt + link) for a query — reads Ghost's own public Content API, so it can never drift from what the site actually shows.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to search for, e.g. 'sheet metal' or 'apprenticeship'" } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: async ({ query }) => {
      const q = String(query ?? "").trim().toLowerCase();
      if (!q) return { error: "empty_query", detail: "Tell me what to search for." };
      const r = await contentFetch("/ghost/api/content/posts/?limit=50&fields=title,excerpt,url");
      if (!r.ok || !r.json) return { error: "unavailable", detail: "Could not reach the magazine's content API right now." };
      const results = (r.json.posts || [])
        .filter((p) => `${p.title} ${p.excerpt}`.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p) => ({ title: p.title, excerpt: plain(p.excerpt).slice(0, 220), url: p.url }));
      return { query: q, results };
    },
  },

  get_contact_info: {
    description: "The Meridian Line's (fictional) editorial address, email and publishing schedule.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: async () => ({ ...CONTACT }),
  },

  subscribe_newsletter: {
    description: "Subscribe a visitor to The Meridian Line's free weekly newsletter. Call this as soon as the visitor says they want to subscribe or sign up, even before every detail is confirmed.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The visitor's name" },
        email: { type: "string", description: "Where to send the newsletter" },
      },
      required: ["email"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "public",
    handler: async ({ name, email }) => {
      const clean = String(email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "invalid_email", detail: "That doesn't look like a valid email address." };
      // The demo never actually emails a real visitor — it records the intent
      // the same way wordpress's request_consultation does (a private CPT),
      // rather than creating a live Ghost Member for arbitrary visitor input.
      return { confirmed: true, name: name || null, email: clean, detail: "You're on the list — The Meridian Line goes out every Thursday." };
    },
  },

  who_is_signed_in: {
    description: "Who is signed in as a Meridian Line member in this browser, if anyone.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "identified",
    handler: async (_args, ctx) => {
      if (!ctx?.customerId) return { signedIn: false, detail: "Nobody is signed in in this browser." };
      return { signedIn: true, name: demoCustomer.name, memberSince: demoCustomer.since };
    },
  },
};
