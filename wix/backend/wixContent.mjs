// sites/wix/backend/wixContent.mjs
//
// Wren & Oat Bakery's content source. Unlike webflowContent.mjs (Webflow's
// free Starter plan serves a clean, semantic, server-rendered HTML export
// this backend can regex-extract text from), Wix's classic Editor renders
// pages through a heavy client-side runtime — a plain HTTP fetch to the
// published page returns real bytes (confirmed live, HTTP 200, the correct
// <title>), but the page's copy lives inside a large opaque warmup-data
// payload, not clean server-rendered markup a regex can reliably pull
// sentences out of. Rather than pretend a brittle scrape is a live read,
// this module is honest about the split:
//   - `fetchLiveMeta(page)` reads the REAL live bytes for freshness/liveness
//     signals only (title, HTTP status) — proof the page is actually up.
//   - `FACTS` below is a curated description of the SAME real site's copy
//     (business name, menu categories, hours, story) — authored to match
//     what is actually published on mrserebano.wixsite.com/wren-and-oat,
//     kept in sync by hand on every content edit, the same way store.mjs's
//     demoCustomer is a hand-authored fact rather than a live scrape.
//
// Single responsibility: this demo's content facts + a liveness check. No
// MCP/tool logic here.
const SITE_ORIGIN = process.env.WIX_SITE_ORIGIN || "https://mrserebano.wixsite.com/wren-and-oat";
const CACHE_MS = 5 * 60 * 1000;

let cache = { at: 0, meta: null };

/** Fetch the real live page once (cached) — proves the site is actually up and returns its title. */
export async function fetchLiveMeta(path = "/") {
  const now = Date.now();
  if (cache.meta && now - cache.at < CACHE_MS) return cache.meta;
  // GOTCHA: SITE_ORIGIN carries its own path (mrserebano.wixsite.com/wren-and-oat) — a bare
  // `new URL("/", SITE_ORIGIN)` resolves to the ORIGIN root, dropping that path entirely
  // (the site slug), which 404s (confirmed live). "/" means "the site's own page", not "the
  // domain root" — so append path only when it names a real sub-page.
  const url = (path === "/" ? SITE_ORIGIN : new URL(path.replace(/^\//, ""), SITE_ORIGIN.replace(/\/?$/, "/")).toString());
  const res = await fetch(url, { headers: { "user-agent": "busymate-demo-backend/1" } });
  const html = res.ok ? await res.text() : "";
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const meta = { ok: res.ok, status: res.status, title: titleMatch ? titleMatch[1].trim() : null, url };
  cache = { at: now, meta };
  return meta;
}

// Curated to match the real, published site (mrserebano.wixsite.com/wren-and-oat) —
// a Wix "Bakery" template (Cafe & Bakery collection), pages: Home / Menu / Online
// Orders / About / Contact.
export const FACTS = {
  name: "Wren & Oat Bakery",
  tagline: "Small-batch sourdough, pastry, and coffee — baked fresh every morning.",
  story:
    "Wren & Oat started as a Saturday farmers-market stall and grew into a neighborhood bakery. " +
    "Everything is baked in small batches from scratch each morning using a slow-fermented sourdough starter, " +
    "stone-milled flour, and local butter and fruit.",
  hours: [
    { day: "Tue–Fri", hours: "7:00am – 3:00pm" },
    { day: "Sat–Sun", hours: "8:00am – 2:00pm" },
    { day: "Mon", hours: "Closed" },
  ],
  menu: [
    { category: "Bread", items: ["Country sourdough loaf", "Seeded rye", "Baguette"] },
    { category: "Pastry", items: ["Almond croissant", "Morning bun", "Seasonal fruit galette"] },
    { category: "Coffee & Drinks", items: ["Drip coffee", "Cortado", "Chai latte"] },
  ],
  contact: {
    address: "The real live address is on the site's Contact page.",
    ordering: "Online orders open through the site's own Online Orders page.",
  },
};
