#!/usr/bin/env node
/**
 * Everything this demo SERVES that is not WordPress itself.
 *
 *   node sites/woo/build.mjs
 *
 * A static demo gets its agent-readable layers from scripts/build-demo.sh, which
 * renders content/*.md into a docroot. This demo has no docroot: the pages are
 * real WordPress pages and the catalogue is a real WooCommerce database. So the
 * inputs here are the two places that content actually lives —
 *
 *   • seed/pages.json — the exact HTML the four policy pages were seeded with,
 *     and therefore the exact words the live pages show;
 *   • the store's own PUBLIC Store API — the live catalogue, so a price that
 *     moved in WooCommerce cannot leave a stale number in llms-full.txt or in
 *     the assistant's knowledge (three products are on sale and seed/catalog.json
 *     does not know it).
 *
 * and the outputs are written into sites/woo/public/, which sites/woo/provision.sh
 * copies verbatim into the WordPress container for the mu-plugin to serve.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../_shared/gen-agent-files.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "public");
const SITE = "https://woo.demo.busymate.ai";

const brand = JSON.parse(readFileSync(join(HERE, "brand.json"), "utf8"));
const demo = JSON.parse(readFileSync(join(HERE, "demo.json"), "utf8"));
const pages = JSON.parse(readFileSync(join(HERE, "seed", "pages.json"), "utf8")).pages;
const catalogSeed = JSON.parse(readFileSync(join(HERE, "seed", "catalog.json"), "utf8"));

mkdirSync(OUT, { recursive: true });

// ── HTML in, Markdown out ───────────────────────────────────────────────────
// Small on purpose: the input is our own seeded HTML, four files of it, using
// eight tags. A dependency here would be a dependency for eight tags.
const ENTITIES = {
  "&euro;": "€", "&ndash;": "–", "&mdash;": "—", "&amp;": "&", "&lt;": "<",
  "&gt;": ">", "&quot;": '"', "&#8217;": "’", "&#8216;": "‘",
  "&#8220;": "“", "&#8221;": "”", "&nbsp;": " ", "&hellip;": "…",
  "&deg;": "°", "&times;": "×", "&rsquo;": "’", "&lsquo;": "‘",
};
const entities = (s) => String(s ?? "").replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m] ?? m);

function toMarkdown(html) {
  let out = entities(html);
  out = out.replace(/<table>[\s\S]*?<\/table>/g, (table) => {
    const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) =>
      [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => entities(c[1].replace(/<[^>]+>/g, "").trim())));
    if (!rows.length) return "";
    const [head, ...body] = rows;
    return `\n\n| ${head.join(" | ")} |\n| ${head.map(() => "---").join(" | ")} |\n`
      + body.map((r) => `| ${r.join(" | ")} |`).join("\n") + "\n\n";
  });
  out = out
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, "\n\n### $1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, "- $1\n")
    .replace(/<\/?(ul|ol)[^>]*>/g, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/g, "\n\n$1\n\n")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/g, "*$2*")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, "[$2]($1)")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

const plain = (html) => entities(String(html ?? "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

// ── the live catalogue ──────────────────────────────────────────────────────
const priceOf = (prices) => {
  const dp = Number(prices?.currency_minor_unit ?? 2);
  const symbol = entities(prices?.currency_symbol ?? "€");
  const money = (minor) => `${symbol}${(Number(minor ?? 0) / 10 ** dp).toFixed(dp)}`;
  const onSale = Number(prices?.sale_price ?? 0) < Number(prices?.regular_price ?? 0);
  return { now: money(prices?.price), was: onSale ? money(prices?.regular_price) : null };
};

async function liveCatalogue() {
  const res = await fetch(`${SITE}/wp-json/wc/store/v1/products?per_page=100&orderby=title&order=asc`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`the live catalogue answered ${res.status} — build refused rather than ship stale prices`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("the live catalogue is empty — build refused");
  return rows;
}

const products = await liveCatalogue();
console.error(`woo: ${products.length} live products`);

const productLine = (p) => {
  const price = priceOf(p.prices);
  const attrs = (p.attributes ?? []).map((a) => `${plain(a.name)}: ${(a.terms ?? []).map((t) => plain(t.name)).join(", ")}`);
  return [
    `${plain(p.name)} (${p.sku}) — ${price.now}${price.was ? ` (was ${price.was})` : ""}.`,
    p.is_in_stock ? "" : "Currently out of stock.",
    typeof p.low_stock_remaining === "number" ? `Only ${p.low_stock_remaining} left.` : "",
    attrs.length ? `${attrs.join(". ")}.` : "",
    plain(p.description) || plain(p.short_description),
    `Page: ${p.permalink}`,
  ].filter(Boolean).join(" ");
};

// ── the Markdown twins ──────────────────────────────────────────────────────
const pageBySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
for (const page of pages) {
  const title = entities(page.title);
  writeFileSync(
    join(OUT, `${page.slug}.md`),
    `# ${title}\n\n> ${brand.name} — ${brand.tagline}\n> A Busymate AI demonstration store. Source: ${SITE}/${page.slug}/\n\n`
    + `${toMarkdown(page.content)}\n`,
  );
}

const byCategory = new Map();
for (const p of products) {
  for (const c of p.categories ?? []) {
    const key = plain(c.name);
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(p);
  }
}

const indexMd = `# ${brand.name}\n\n> ${brand.tagline}\n> A Busymate AI demonstration store — nothing is dispatched and no payment is taken. Source: ${SITE}/\n\n`
  + `${plain(demo.tagline)}\n\n`
  + [...byCategory.entries()].map(([name, rows]) => {
    const cat = catalogSeed.categories.find((c) => c.name.replace(/&amp;/g, "&") === name);
    return `## ${name}\n\n${cat ? `${cat.description}\n\n` : ""}`
      + rows.map((p) => `- ${productLine(p)}`).join("\n");
  }).join("\n\n")
  + `\n\n## Policies\n\n`
  + pages.map((p) => `- [${entities(p.title)}](${SITE}/${p.slug}/) — Markdown: ${SITE}/${p.slug}.md`).join("\n")
  + `\n\n## Delivery, in short\n\n`
  + `| Destination | Cost | Free over |\n| --- | --- | --- |\n`
  + catalogSeed.shipping.zones.map((z) => `| ${z.name} | €${z.flat_rate} | ${z.free_over ? `€${z.free_over}` : "—"} |`).join("\n")
  + `\n`;
writeFileSync(join(OUT, "index.md"), indexMd);

// ── the assistant's knowledge ───────────────────────────────────────────────
const sources = [];
const push = (key, label, kind, content) => {
  const text = String(content ?? "").trim();
  if (text) sources.push({ key: `woo:${key}`, label, kind, content: text.slice(0, 20000) });
};

push("about", `About ${brand.name}`, "reference",
  `${brand.name}. ${brand.tagline}\n${plain(demo.tagline)}\n`
  + `A small travel-gear workshop in ${catalogSeed.store.city}, Germany, selling in euros. `
  + `Website: ${SITE}/. Fernweh Supply Co. is an INVENTED brand used to demonstrate Busymate AI on a real `
  + `WooCommerce store: no order is fulfilled, no payment is taken, and the customer behind the sign-in `
  + `card is not a real person. Tell anyone who is about to enter real personal or payment data not to.`);

// NOT the catalogue. The products are indexed by the WooCommerce STORE
// CONNECTION (`connect_commerce`, #2842) straight off this shop's REST API —
// 16 pages cited to their real permalinks — and answered live by the MCP
// server's `search_products`/`get_product`. Publishing them here as well would
// index the same fourteen products twice against the tenant's chunk budget and
// leave a copy to go stale the moment a price moves. What follows is only what
// the connector does NOT carry: the shop's own words, and how to behave.
push("catalogue-pointer", "Where the catalogue comes from", "fact",
  `${brand.name} sells ${products.length} products across `
  + `${[...byCategory.keys()].join(", ")}. The catalogue is NOT in this text: it is read live from the `
  + "shop's own WooCommerce store — the connected store source for the product pages, and the store's MCP "
  + "tools (search_products, get_product) for a price, a stock count or a specification right now. When a "
  + "shopper asks what is available, what something costs, what it is made of or whether it is in stock, "
  + "CALL a tool; never answer a catalogue question from memory, and never quote a number this text does "
  + "not contain.");

push("delivery", "Delivery, cost and transit times", "howto",
  toMarkdown(pageBySlug.shipping.content) + `\n\nFull page: ${SITE}/shipping/`);
push("returns", "Returns and repairs", "howto",
  toMarkdown(pageBySlug.returns.content) + `\n\nFull page: ${SITE}/returns/`);
push("privacy", "Privacy", "howto",
  toMarkdown(pageBySlug.privacy.content) + `\n\nFull page: ${SITE}/privacy/`);
push("terms", "Terms", "howto",
  toMarkdown(pageBySlug.terms.content) + `\n\nFull page: ${SITE}/terms/`);

push("demo-account", "The provided demo customer", "fact",
  "One throwaway demo customer is provided so the identified experience can be tested without a real "
  + "account: Mara Oertel, a customer of this shop, with five orders in five different states — one being "
  + "packed, one completed, one refunded, one cancelled and one on hold. Order details, returns and the "
  + "order history are only ever given to that customer once this chat can see who is asking.");

push("signing-in", "Signing in", "howto",
  "Most of what a visitor asks for needs NO sign-in: the range, prices, stock, delivery costs, returns, "
  + "privacy and terms all answer for an anonymous visitor, and asking them to sign in first for any of "
  + "those is wrong. Only the order book — where is my order, what have I ordered, starting a return — "
  + "needs to know who is asking. For those, just TRY the order tool. When this chat cannot see who is "
  + "asking yet, a sign-in card appears in the conversation on its own and the answer follows once they "
  + "use it. Signing in is one click, there is no password, and it returns them to this same conversation "
  + "as the demo customer. NEVER describe a control or where it is: do not say \"the button at the top\", "
  + "do not point at a header, the storefront or an account page, and do not list ways to sign in — the "
  + "card comes to them and is the only path you offer. Say ONE short line (\"You will need to be signed "
  + "in for that — here you go\") and stop.");

// The one behaviour the tool schemas cannot express. Measured: "I would like to
// return something from one of my orders" ended in "Which order, and which
// item?" — a list of things to type, which is exactly the shape the standard
// forbids. The card only appears when the TOOL is called, so the instruction is
// to call it early and let the card do the asking.
push("asking-for-details", "How to ask for details", "howto",
  "When something is missing — an order number, which item is going back, why — do NOT write the "
  + "question out as a paragraph or a list for the customer to type answers to. CALL the tool anyway, "
  + "with whatever is already known and nothing else: get_order_status with no order number, "
  + "start_return with only what was said. The tool answers with its own card in the chat — labelled "
  + "fields and a submit button — the customer fills that in, and the tool then runs for real. One short "
  + "line of context before it is plenty; never enumerate the fields in prose as well.\n"
  + "NEVER PUT UP A FORM FOR SOMETHING ALREADY SAID. If the message already names the order and the "
  + "item — \"open a return for the Quelle 750 on order 53\" — call start_return with them THERE AND "
  + "THEN. A form that asks again for what was just typed reads as not having listened, and an EMPTY "
  + "form when every answer is already on screen is the worst version of it. A form is for what is "
  + "genuinely missing, and only for that.\n"
  + "THE MOMENT A FORM COMES BACK FILLED IN, CALL THE TOOL WITH WHAT IT SAID. A message that begins "
  + "\"Start the return — here are the details\" is not the end of the job, it is the arguments for "
  + "start_return: call start_return(orderNumber, item, reason) with them, right then, and say nothing "
  + "about the outcome until the result is back. Do not put a second form in the conversation, do not ask "
  + "the same three things again under a different heading, and do not summarise the answers back as "
  + "though something happened.\n"
  + "A FORM IS NOT AN OUTCOME. Collecting answers changes nothing on its own: a return exists only once "
  + "start_return has RUN and come back with a reference beginning RMA-, and an order's state is only "
  + "what get_order_status just returned. Once details are in hand, call the tool and report what IT "
  + "said. Never tell a customer a return is open, a label is coming, or a parcel is on its way unless a "
  + "tool result in this conversation says so — on this shop nothing is dispatched anyway, so an "
  + "invented confirmation is the one answer that is simply false.\n"
  + "get_product needs a SKU or a product name. If neither has been said, use search_products instead; "
  + "calling get_product with nothing puts an empty box in the conversation and asks the customer to do "
  + "the assistant's work.");

push("what-this-demo-shows", "What this demonstration shows", "reference",
  "This shop is the WooCommerce demo on the Busymate AI playground. It demonstrates, and can be asked "
  + "about: answers grounded in this store's own pages; six of the page's own actions published over "
  + "WebMCP (search, read the cart, add an item, remove one, open a product, who is signed in); the "
  + "store's own MCP server at " + SITE + "/mcp with three public tools and three that answer only for an "
  + "identified customer; the identity handoff, both halves, signed by the store's own key; action cards "
  + "for a return and an order lookup; and hand-off to a person, which queues the conversation to the "
  + "workspace Inbox. Every one of those is explained in a block on the shop's front page, each with a "
  + "line to try and a link to the guide for doing the same on a real store.");

const chars = sources.reduce((n, s) => n + s.content.length, 0);
if (chars > 40000) {
  console.error(`woo: knowledge is ${chars} chars, over the 40,000 limit`);
  process.exit(1);
}
writeFileSync(join(HERE, "knowledge.json"), JSON.stringify({ knowledge_sources: sources }, null, 2));
console.error(`woo: ${sources.length} knowledge sources, ${chars} chars`);

// ── llms-full.txt: every page, in full, in one request ──────────────────────
// Built from the Markdown twins rather than from knowledge.json — the shared
// generator's knowledge fallback exists for a demo whose pages ARE its
// knowledge, and this one's are not: the catalogue is deliberately absent from
// the published knowledge (the store connection carries it) but an agent
// reading one file still expects the whole shop in it.
const fullSections = [
  ["The shop", readFileSync(join(OUT, "index.md"), "utf8")],
  ...pages.map((p) => [entities(p.title), readFileSync(join(OUT, `${p.slug}.md`), "utf8")]),
];
writeFileSync(
  join(OUT, "llms-full.txt"),
  `# ${brand.name}\n\nSource: ${SITE}/\n\n> ${brand.tagline} A Busymate AI demonstration WooCommerce store.\n\n`
  + "This is the whole shop in one request: every product with its price, stock and specification, "
  + "and all four policy pages in full.\n\n"
  + fullSections.map(([title, body]) => `## ${title}\n\n${body.trim()}`).join("\n\n---\n\n") + "\n",
);

// ── llms.txt, agents.json ───────────────────────────────────────────────────
// `generate` only writes llms-full.txt when it is ABSENT; ours is written above,
// so it leaves it alone and only reports that the file exists.
const { default: agentConfig } = await import(join(HERE, "agent-files.config.mjs"));
generate(agentConfig);
console.error("woo: llms.txt, llms.txt.md, llms-full.txt, agents.json, .well-known/agents.json");
