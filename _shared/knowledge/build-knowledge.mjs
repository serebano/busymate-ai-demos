#!/usr/bin/env node
/**
 * What the assistant is allowed to know, built from what the site actually says.
 *
 *   node sites/_shared/knowledge/build-knowledge.mjs <demo-name>
 *
 * Emits the `knowledge_sources` array for `publish_tenant_runtime`, assembled
 * from the demo's own `content/*.md` and its store data — so the assistant is
 * grounded in the same words the pages show a visitor, and a content edit is one
 * rebuild away from being answerable.
 *
 * Publishing REPLACES a workspace's config, so the array this prints must go out
 * whole on every publish. Print it, review it, publish it:
 *
 *   node sites/_shared/knowledge/build-knowledge.mjs web > /tmp/knowledge.json
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const name = process.argv[2];
if (!name) { console.error("usage: build-knowledge.mjs <demo-name>"); process.exit(2); }

const site = join(ROOT, "sites", name);
const demo = JSON.parse(readFileSync(join(site, "demo.json"), "utf8"));
const brand = existsSync(join(site, "brand.json"))
  ? JSON.parse(readFileSync(join(site, "brand.json"), "utf8"))
  : { name: demo.title };
const origin = brand.siteUrl ?? `https://${demo.subdomain}.demo.busymate.ai`;
const prefix = name;

/** Markdown, flattened to the plain prose a grounded answer quotes. */
function plain(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^#.*$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*`>]/g, "")
    .replace(/\|/g, " ")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const sources = [];
const push = (key, label, kind, content) => {
  const text = content.trim();
  if (text) sources.push({ key: `${prefix}:${key}`, label, kind, content: text.slice(0, 20000) });
};

// 1. who this business is
push("about", `About ${brand.name}`, "reference",
  `${brand.name}. ${brand.tagline ?? ""}\n`
  + `${demo.tagline ?? ""}\n`
  + `Website: ${origin}. This is a demonstration store used to show how the assistant works: `
  + "no order is fulfilled, no payment is taken, and the customer behind the sign-in button is not a real person.");

// 2. the catalogue, as facts rather than a table
const dataPath = join(site, "backend", "data", "store.json");
if (existsSync(dataPath)) {
  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  if (data.store?.story) push("story", "Our story", "reference", data.store.story);
  if (Array.isArray(data.products)) {
    push("products", "Products and catalogue", "reference",
      data.products.map((p) => [
        `${p.name} (${p.sku}), ${p.size}, ${data.store?.currency === "USD" ? "$" : ""}${p.price}.`,
        p.originDetail ? `Origin ${p.originDetail}.` : "",
        p.process ? `${p.process}.` : "",
        p.roast ? `${p.roast} roast.` : "",
        p.notes ? `Tasting notes: ${p.notes}.` : "",
        p.bestFor ? `Best for ${p.bestFor}.` : "",
        p.description ?? "",
      ].filter(Boolean).join(" ")).join("\n\n"));
  }
  if (Array.isArray(data.faq) && data.faq.length) {
    push("faq", "Questions people ask", "howto",
      data.faq.map((row) => `Q: ${row.q}\nA: ${row.a}`).join("\n\n"));
  }
  if (Array.isArray(data.testimonials) && data.testimonials.length) {
    push("reviews", "What customers say", "reference",
      data.testimonials.map((t) => `${t.name} (${t.role}): "${t.quote}"`).join("\n"));
  }
  if (data.customer) {
    const c = data.customer;
    push("demo-account", "The demo customer", "fact",
      `A single throwaway demo customer is provided so the identified experience can be tested without `
      + `a real account: ${c.name}, a customer since ${c.since}. `
      + (c.subscription ? `Subscription: ${c.subscription.plan}, ${c.subscription.beans}, ${c.subscription.grind}, next shipment ${c.subscription.nextShipment}, ${c.subscription.discount} off, ${c.subscription.status}. ` : "")
      + (Array.isArray(data.orders)
        ? data.orders.map((o) => `Order ${o.number}, placed ${o.placed}, ${o.status}`
          + (o.tracking ? `, ${o.carrier} tracking ${o.tracking}` : "")
          + (o.eta ? `, expected ${o.eta}` : "")
          + `: ${o.items.map((i) => `${i.qty} x ${i.name}`).join(", ")}, total $${o.total}.`).join(" ")
        : "")
      + " Order details are only ever given to that signed-in customer.");
  }
}

// 3. every policy page, in the words the page shows
const contentDir = join(site, "content");
if (existsSync(contentDir)) {
  for (const file of readdirSync(contentDir).filter((f) => f.endsWith(".md") && f !== "index.md")) {
    const raw = readFileSync(join(contentDir, file), "utf8");
    const title = /^title:\s*(.+)$/m.exec(raw)?.[1]?.trim() ?? file.replace(/\.md$/, "");
    push(file.replace(/\.md$/, ""), title, "howto",
      `${plain(raw)}\n\nFull page: ${origin}/${file.replace(/\.md$/, "")}`);
  }
}

// 4. how a visitor signs in — the one behaviour the assistant keeps getting wrong
push("signing-in", "Signing in", "howto",
  "Most of what a visitor asks for needs NO sign-in at all: searching the range, reading the cart, "
  + "adding something to the cart, prices, stock and every policy all work for an anonymous visitor, "
  + "and asking them to sign in first for any of those is wrong. Only the order book - where is my "
  + "order, my subscription, starting a return - needs to know who is asking. "
  + "For those, just TRY the order tool. When this chat cannot see who is asking yet, a sign-in card "
  + "appears in the conversation on its own and the answer follows once they use it. Signing in is one "
  + "click, there is no password, and it returns them to this same conversation as the demo customer - "
  + "nobody has to leave the chat or create an account. "
  + "NEVER describe a control or where it is. Do not say \"the button at the top of the chat\", do not "
  + "point at a header, a storefront page or an account page, and do not list ways to sign in - the card "
  + "comes to them and is the only path you offer. Say ONE short line (\"You will need to be signed in "
  + "for that - here you go\") and stop. Do not repeat the request.");

const total = sources.reduce((n, s) => n + s.content.length, 0);
if (total > 40000) {
  console.error(`${name}: knowledge is ${total} chars, over the 40,000 limit`);
  process.exit(1);
}
console.error(`${name}: ${sources.length} sources, ${total} chars`);
console.log(JSON.stringify(sources, null, 2));
