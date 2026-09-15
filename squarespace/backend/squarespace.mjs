// sites/squarespace/backend/squarespace.mjs
//
// The only thing in this demo that talks to Squarespace.
//
// Squarespace is a hosted SaaS (like BigCommerce/Shopify) — there is no
// self-hosted plugin to own identity, so this backend is self-hosted end to
// end (same shape as sites/bigcommerce/backend): it reads the real Quiet
// Pines Yoga trial site LIVE, straight off its own published pages, and the
// shared mcp-identity-server.mjs provides identity for a fixed, documented
// demo visitor — the same pattern every non-self-hostable demo in this repo
// uses.
//
// WHAT WE LEARNED (2026-09-15, this lane): the owner's brief assumed every
// Squarespace page serves a real content JSON at `?format=json`. That is
// true for the classic (pre-Fluid-Engine) page model, but the Blueprint-AI
// / Fluid-Engine template this trial site was built on does NOT put its
// section content in that JSON's `mainContent` field — `mainContent` comes
// back as an EMPTY `<div class="sqs-layout ... empty">` even once the page
// is open, edited and shows "Published" in the site editor. Verified live,
// repeatedly, against the real site (not a guess). So this reader instead
// fetches the site's own RENDERED HTML (the same bytes a visitor's browser
// gets) and extracts readable text from the main content region — a plain,
// honest scrape of the live page, never a hardcoded copy.
//
// The trial site's Site Availability is "Password Protected" (Public
// requires a paid plan upgrade this lane did not purchase — see
// sites/squarespace/README.md). A password-protected Squarespace site's
// anonymous password-gate POST target is a JS-driven endpoint this lane did
// not finish reverse-engineering (see README.md) — so, for now, this reader
// authenticates with the SITE'S OWN CONTRIBUTOR SESSION COOKIE (the owner's
// logged-in Squarespace session, refreshed periodically into the Vault),
// exactly the same shape sites/bigcommerce/README.md used ("verified
// instead on /preview") while its storefront was prelaunch-gated.
//
// Credentials come from the container's own env, injected at `docker run`
// time from a 0600 file on the box — never committed, never printed.

const SITE_ORIGIN = process.env.SQSP_SITE_ORIGIN ?? "https://bat-vanilla-s2x4.squarespace.com";
const SESSION_COOKIE = process.env.SQSP_SESSION_COOKIE ?? ""; // contributor session; see README.md

/** Can this process read the live site at all? */
export const apiReady = Boolean(SITE_ORIGIN);

const PAGES = [
  { slug: "", title: "Home" },
  { slug: "about", title: "About" },
  // Squarespace auto-slugged this one "services-store" (not "services") when
  // the page was created — read live off the real nav, never assumed.
  { slug: "services-store", title: "Services" },
  { slug: "appointments", title: "Appointments" },
  { slug: "contact", title: "Contact" },
];

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(slug) {
  if (!apiReady) throw new Error("squarespace_unconfigured");
  const url = `${SITE_ORIGIN}/${slug}`;
  const res = await fetch(url, {
    headers: {
      accept: "text/html",
      ...(SESSION_COOKIE ? { cookie: SESSION_COOKIE } : {}),
    },
  });
  if (!res.ok) throw new Error(`squarespace_http_${res.status}`);
  return res.text();
}

// Squarespace's Fluid Engine content lives inside `<main>` (or the page's
// root content region); this pulls just that slice, falls back to <body>.
function mainRegion(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/i);
  const body = html.match(/<body[\s\S]*?<\/body>/i);
  return stripHtml(main?.[0] ?? body?.[0] ?? html);
}

let pageCache = { at: 0, rows: new Map() };
async function livePage(slug) {
  const cached = pageCache.rows.get(slug);
  if (cached && Date.now() - cached.at < 60_000) return cached.text;
  const html = await fetchPage(slug);
  const text = mainRegion(html);
  pageCache.rows.set(slug, { at: Date.now(), text });
  return text;
}

/** Every page's live, readable text — the studio's own words, nothing typed by hand. */
export async function allPages() {
  const rows = await Promise.all(
    PAGES.map(async (p) => ({ title: p.title, path: p.slug ? `/${p.slug}` : "/", text: await livePage(p.slug).catch((e) => `(could not read live: ${e.message})`) })),
  );
  return { count: rows.length, pages: rows };
}

export async function pageByTitle(title) {
  const want = String(title ?? "").toLowerCase().trim();
  const hit = PAGES.find((p) => p.title.toLowerCase() === want || p.slug === want);
  if (!hit) return { error: "not_found", detail: `Quiet Pines Yoga has no "${title}" page. Pages: ${PAGES.map((p) => p.title).join(", ")}.` };
  const text = await livePage(hit.slug);
  return { title: hit.title, path: hit.slug ? `/${hit.slug}` : "/", text };
}

export async function searchSite(query) {
  const needle = String(query ?? "").toLowerCase().trim();
  const { pages } = await allPages();
  if (!needle) return { count: pages.length, matches: pages };
  const matches = pages.filter((p) => p.text.toLowerCase().includes(needle));
  return { count: matches.length, matches };
}

// Booking options are read straight off the live Services page copy — the
// Appointments page itself only shows a "Book a Studio Session" intro; the
// actual session list is a client-side-rendered scheduling widget this
// server-side fetch cannot see (a real, tested finding: the widget's markup
// never appears in the plain HTML response — see README.md). The Services
// page's class list ("Foundations Yoga Class ... $25.00", etc.) is real,
// static, server-rendered text, so that is the honest source for "what can
// I book" until the scheduling widget's own API is wired in.
export async function bookingOptions() {
  const text = await livePage("services-store");
  const rows = [];
  // "<Name> Class <description ending in a period> $<price>"
  const re = /([A-Z][A-Za-z ]{2,40}?Class)\b(.*?)\$(\d+(?:\.\d{2})?)/g;
  let m;
  while ((m = re.exec(text))) {
    rows.push({ name: m[1].trim(), duration: null, price: `$${m[3]}` });
  }
  return {
    count: rows.length,
    options: rows.length ? rows : [{ name: "See the live Services page", duration: null, price: null }],
    sourcePath: "/services-store",
    note: "The Appointments page's own time-slot picker is a client-rendered widget this reader cannot see; these are the studio's published class/price list instead.",
  };
}
