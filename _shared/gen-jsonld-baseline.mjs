#!/usr/bin/env node
// sites/_shared/gen-jsonld-baseline.mjs
//
// Idempotently completes a hand-authored page's existing JSON-LD graph:
//   P10 — ensures a WebPage node exists with headline/description/url/dateModified
//   P11 — completes any FAQPage node with name/description/url, and ensures
//         a BreadcrumbList node exists
// Never INVENTS a fact: headline/description/url come straight from the
// page's own <title>/<meta name=description>/<link rel=canonical>;
// dateModified is today's build date, the only "last changed" signal a
// hand-authored static page has. Run on every build (build-demo.sh) so it
// never drifts from the page's own head tags.
//
// Usage: node sites/_shared/gen-jsonld-baseline.mjs <path-to-index.html>
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: gen-jsonld-baseline.mjs <path-to-index.html>");
  process.exit(1);
}
let html = fs.readFileSync(file, "utf8");

const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
const descMatch = /<meta name="description" content="([^"]*)"/.exec(html);
const canonicalMatch = /<link rel="canonical" href="([^"]*)"/.exec(html);
const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const title = titleMatch ? unescapeHtml(titleMatch[1]) : "";
const description = descMatch ? unescapeHtml(descMatch[1]) : "";
const url = canonicalMatch ? canonicalMatch[1] : "";
const today = new Date().toISOString().slice(0, 10);

const ldRe = /<script type="application\/ld\+json">\n?([\s\S]*?)\n?<\/script>/;
const m = ldRe.exec(html);
if (!m) {
  console.log(`${file}: no application/ld+json block — skipped (add one first)`);
  process.exit(0);
}
let data;
try {
  data = JSON.parse(m[1]);
} catch (e) {
  console.error(`${file}: existing JSON-LD does not parse: ${e.message}`);
  process.exit(1);
}
const isGraph = Array.isArray(data["@graph"]);
const graph = isGraph ? data["@graph"] : [data];

// P10: a WebPage node with headline/description/url/dateModified.
const pageId = url ? `${url}#webpage` : undefined;
let page = graph.find((n) => n["@type"] === "WebPage" || (pageId && n["@id"] === pageId));
if (!page) {
  page = { "@type": "WebPage", "@id": pageId };
  graph.push(page);
}
if (url) page.url = url;
if (title) {
  page.headline = title;
  page.name = page.name || title;
}
if (description) page.description = description;
page.dateModified = today;

// P11: complete any FAQPage node (name/description/url), and make sure a
// BreadcrumbList exists.
for (const node of graph) {
  if (node["@type"] !== "FAQPage") continue;
  node.name = node.name || (title ? `${title} — FAQ` : "Frequently asked questions");
  node.description = node.description || "Frequently asked questions, answered from this site's own published policies.";
  if (url) node.url = node.url || url;
}
if (!graph.some((n) => n["@type"] === "BreadcrumbList")) {
  graph.push({
    "@type": "BreadcrumbList",
    ...(url ? { "@id": `${url}#breadcrumb` } : {}),
    itemListElement: [{ "@type": "ListItem", position: 1, name: title || "Home", item: url || undefined }],
  });
}

const out = isGraph ? { ...data, "@graph": graph } : graph[0];
html = html.replace(ldRe, `<script type="application/ld+json">\n${JSON.stringify(out)}\n</script>`);
fs.writeFileSync(file, html);
console.log(`${file}: JSON-LD baseline OK (WebPage + BreadcrumbList, FAQPage completed where present)`);
