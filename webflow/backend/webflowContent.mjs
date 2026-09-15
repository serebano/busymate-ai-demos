// sites/webflow/backend/webflowContent.mjs
//
// Aldercroft Studio's ONLY source of truth for its own content: the live
// published page on Webflow's own hosting. Webflow's free Starter plan
// exposes no Content API (that's a paid-plan CMS feature) and this backend
// has no local copy of the site to drift from it — so every tool reads the
// SAME bytes a visitor's browser would get, fetched fresh (short TTL cache,
// so a busy demo doesn't hammer Webflow's free hosting on every tool call).
//
// Single responsibility: fetch + extract section text by id. No MCP/tool
// logic here.
const SITE_ORIGIN = process.env.WEBFLOW_SITE_ORIGIN || "https://aldercroft-studio.webflow.io";
const CACHE_MS = 5 * 60 * 1000;

let cache = { at: 0, html: null };

async function fetchHtml() {
  const now = Date.now();
  if (cache.html && now - cache.at < CACHE_MS) return cache.html;
  const res = await fetch(SITE_ORIGIN, { headers: { "user-agent": "busymate-demo-backend/1" } });
  if (!res.ok) throw new Error(`site fetch failed: ${res.status}`);
  const html = await res.text();
  cache = { at: now, html };
  return html;
}

const plain = (html) =>
  String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();

/** The real, current text of one page section (`about`, `properties`, `service`, `testimonial`, `contact`), or null if the section isn't there right now. */
export async function fetchSectionText(sectionId) {
  const html = await fetchHtml();
  const re = new RegExp(`<section id="${sectionId}"[^>]*>([\\s\\S]*?)</section>`);
  const m = html.match(re);
  return m ? plain(m[1]) : null;
}

/** Every known section's text, in one call — for search across the whole page. */
export async function fetchAllSections() {
  const ids = ["about", "properties", "service", "testimonial", "contact"];
  const out = {};
  for (const id of ids) {
    out[id] = await fetchSectionText(id);
  }
  return out;
}
