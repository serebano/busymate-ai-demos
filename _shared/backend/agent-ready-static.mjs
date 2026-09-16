// sites/_shared/backend/agent-ready-static.mjs
//
// The static half of the six-layer agent-ready set (busymate-devtools#2815),
// for a demo with NO rsynced docroot — a DYNAMIC demo backend (ghost,
// squarespace, webflow, wix, bigcommerce) that serves everything from its own
// Node process. Every static demo gets this set from
// sites/_shared/gen-agent-files.mjs + sites/_shared/gen-protocol-files.mjs,
// written to public/ at build time; a dynamic backend has no public/ to write
// into ahead of time, but the files themselves are NOT actually dynamic — the
// tool table, the OpenAPI document, the permissions manifest, the merged
// agents.json — none of it depends on a live request. So this module calls
// the SAME two generators' real, unmodified `generate()` once at cold start,
// into a scratch directory, reads the result back into memory, and hands the
// demo's backend a plain `{path: {body, contentType}}` map to serve from —
// never a second hand-rolled copy of what those generators already build
// (#3053, #3054).
//
// A demo whose content genuinely IS dynamic (Ghost's own posts) keeps that
// part in its own `routes()` — this module only owns the parts that are the
// same on every request.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate as generateAgentFiles } from "../gen-agent-files.mjs";
import { generate as generateProtocolFiles } from "../gen-protocol-files.mjs";
import { buildRobotsTxt, buildSitemapXml } from "../gen-robots-sitemap.mjs";
import { buildCatalog } from "../webmcp-catalog.mjs";

const CONTENT_TYPES = {
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

/**
 * @param {import("../gen-agent-files.mjs").AgentFilesConfig} config
 * @param {object} [opts]
 * @param {{name:string,title?:string,description:string,inputSchema:object,annotations?:object}[]} [opts.webmcpTools]
 *   the tools ACTUALLY registered on this demo's own page (document.modelContext) —
 *   omit for a demo with none (webmcp-catalog.json is then omitted too, never faked).
 * @returns {Record<string, {body:string, contentType:string}>}
 */
export function buildStaticAgentFiles(config, opts = {}) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-ready-static-"));
  try {
    const cfg = { ...config, outDir };
    generateAgentFiles(cfg);
    generateProtocolFiles(cfg);

    const files = {};
    const walk = (dir, prefix = "") => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full, rel); continue; }
        const ext = path.extname(entry.name);
        files[`/${rel}`] = {
          body: fs.readFileSync(full, "utf8"),
          contentType: CONTENT_TYPES[ext] ?? "application/json; charset=utf-8",
        };
      }
    };
    walk(outDir);

    // robots.txt: not written by either generator (they're for a rsynced
    // docroot's content-page pipeline) — same builder scripts/gen-content-pages.mjs
    // uses for a static demo (#3053).
    files["/robots.txt"] = { body: buildRobotsTxt(config.siteUrl), contentType: "text/plain; charset=utf-8" };
    // sitemap.xml: same "urls" the generator's own sitemap.md draws from —
    // config.pages, one <url> each, the home page weighted highest.
    files["/sitemap.xml"] = {
      body: buildSitemapXml((config.pages || []).map((p) => ({ loc: p.url, priority: p.url === `${config.siteUrl}/` ? 1.0 : 0.8 }))),
      contentType: "application/xml; charset=utf-8",
    };

    // webmcp-catalog.json: only for the tools this demo's OWN page genuinely
    // registers — an empty/omitted list here is honest; a fabricated one is not.
    if (opts.webmcpTools?.length) {
      const doc = buildCatalog(config.siteUrl, opts.webmcpTools);
      files["/webmcp-catalog.json"] = { body: `${JSON.stringify(doc, null, 2)}\n`, contentType: "application/json; charset=utf-8" };
    }

    return files;
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

/**
 * The `routes(req, res, url)` hook sites/_shared/backend/mcp-identity-server.mjs's
 * `start()` calls — serves the precomputed map, GET only, and lets everything
 * else (including a demo's own dynamic routes chained after this one) fall through.
 * @param {Record<string, {body:string, contentType:string}>} files
 */
export function serveStaticAgentFiles(files) {
  return async function routes(req, res, url) {
    if (req.method !== "GET") return false;
    const f = files[url.pathname];
    if (!f) return false;
    const headers = { "Content-Type": f.contentType, "Cache-Control": "public, max-age=300" };
    if (url.pathname.endsWith("agents.json") || url.pathname === "/openapi.json" || url.pathname === "/webmcp-catalog.json") {
      headers["Access-Control-Allow-Origin"] = "*";
    }
    res.writeHead(200, headers).end(f.body);
    return true;
  };
}

// ---------------------------------------------------------------------------
// The homepage half (busymate-devtools#3070): a dynamic backend whose real
// site is externally hosted or gated (ghost/squarespace/webflow/wix/
// bigcommerce) still needs ITS OWN "/" to carry the v1-REQUIRED evidence a
// live scan checks directly against the page — <html lang>, a canonical
// Link, JSON-LD Organization+WebSite identity, and a human contact line
// (R6/R7/R10) — plus the SAME-URL Markdown negotiation and Link discovery
// headers a static demo's nginx vhost proves for it (R2/R5). A 302 to the
// real external site answers none of that (no body to evidence anything
// against), so every one of these backends serves a genuine same-origin
// preview page instead — the real site stays one link away, never hidden.
// ONE shared builder so five demos don't hand-roll five near-identical pages
// (#3053, #3054 precedent: never a second hand-typed copy of a shared shape).

/**
 * Organization + WebSite JSON-LD (R7), built from the demo's own brand.json
 * shape (name/tagline/siteUrl + an optional contact) — never invented copy.
 * @param {{name:string, tagline?:string, siteUrl:string, contact?:{email?:string, tel?:string}}} brand
 */
export function buildIdentityJsonLd(brand) {
  const orgId = `${brand.siteUrl}/#org`;
  const org = {
    "@type": "Organization",
    "@id": orgId,
    name: brand.name,
    url: brand.siteUrl,
    ...(brand.contact?.email ? { email: brand.contact.email } : {}),
    ...(brand.contact?.tel ? { telephone: brand.contact.tel } : {}),
  };
  const site = {
    "@type": "WebSite",
    "@id": `${brand.siteUrl}/#website`,
    url: brand.siteUrl,
    name: brand.name,
    ...(brand.tagline ? { description: brand.tagline } : {}),
    publisher: { "@id": orgId },
  };
  return { "@context": "https://schema.org", "@graph": [org, site] };
}

function contactLine(contact) {
  if (!contact) return "";
  const parts = [];
  if (contact.email) parts.push(`<a href="mailto:${contact.email}">${contact.email}</a>`);
  if (contact.tel) parts.push(`<a href="tel:${contact.tel}">${contact.tel}</a>`);
  return parts.join(" · ");
}

/**
 * Renders this backend's own same-origin homepage (R6/R7/R10) — `<html
 * lang>`, `<link rel="canonical">` back to ITSELF (this page is the real
 * page for this origin; the external site is a different origin, linked
 * from the body, never claimed as this page's own canonical), the identity
 * JSON-LD, and a human contact line.
 * @param {object} opts
 * @param {{name:string, tagline?:string, siteUrl:string, contact?:{email?:string, tel?:string}}} opts.brand
 * @param {string} opts.realSiteUrl the externally-hosted/gated real site
 * @param {string} [opts.realSiteLabel] e.g. "Webflow", "Wix", "BigCommerce"
 * @param {string} [opts.lang]
 * @param {string} [opts.bodyHtml] extra body markup (a sign-in button, an embed) — appended as-is
 */
export function renderLandingHome(opts) {
  const { brand, realSiteUrl, realSiteLabel = "the platform's own hosting", lang = "en", bodyHtml = "" } = opts;
  const jsonLd = buildIdentityJsonLd(brand);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${brand.name} — preview</title>
<link rel="canonical" href="${brand.siteUrl}/">
<link rel="webmcp-catalog" href="/webmcp-catalog.json">
<link rel="alternate" type="application/json" href="/.well-known/agents.json">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px">
<h1>${brand.name} (preview)</h1>
<p>${brand.tagline ? `${brand.tagline} ` : ""}Same-origin proof page: the real site runs on ${realSiteLabel} (<a href="${realSiteUrl}">${realSiteUrl}</a>) and cannot serve a custom file or header at a path it doesn't already own, so this backend's own origin carries the six-layer agent-ready set, the identity provider and the embed proof instead.</p>
${bodyHtml}
<p style="font-size:13px;opacity:.75">Contact: ${contactLine(brand.contact) || "see llms.txt"}</p>
</body></html>`;
}

/** The same page's content as a Markdown twin — the SAME URL negotiates to this (R2), never a parallel /md URL. */
export function renderLandingMarkdown(opts) {
  const { brand, realSiteUrl, realSiteLabel = "the platform's own hosting" } = opts;
  const contact = brand.contact?.email ?? brand.contact?.tel ?? "see llms.txt";
  return `# ${brand.name}

${brand.tagline ? `${brand.tagline}\n\n` : ""}Real site: ${realSiteUrl} (hosted on ${realSiteLabel})

Contact: ${contact}
`;
}

/**
 * The `routes` hook that serves "/" (and "/preview", the same content, for
 * whatever already links there) with SAME-URL Markdown negotiation
 * (`Accept: text/markdown` rewrites the representation, never a parallel
 * URL — R2) and belt-and-suspenders Link discovery headers (R5) in case a
 * front proxy in front of this backend doesn't already add them.
 * @param {{html:string, markdown:string}} pages
 */
export function serveLandingHome(pages) {
  return async function routes(req, res, url) {
    if (req.method !== "GET") return false;
    if (url.pathname !== "/" && url.pathname !== "/preview" && url.pathname !== "/index.md") return false;
    const wantsMarkdown = url.pathname === "/index.md" || /text\/markdown/i.test(req.headers.accept || "");
    const body = wantsMarkdown ? pages.markdown : pages.html;
    res.writeHead(200, {
      "Content-Type": wantsMarkdown ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      Link: '</llms.txt>; rel="describedby", </agents.json>; rel="alternate"; type="application/json"',
    }).end(body);
    return true;
  };
}
