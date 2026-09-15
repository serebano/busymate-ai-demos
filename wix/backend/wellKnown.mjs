// sites/wix/backend/wellKnown.mjs
//
// The six-layer agent-ready files (llms.txt, agents.json, sitemap.md,
// AGENTS.md, structured data, an .md twin of the page) for a demo whose
// real site (mrserebano.wixsite.com/wren-and-oat) is on Wix's free plan —
// which cannot serve a custom static file at a path Wix doesn't already
// own. So these are served from THIS backend's own domain instead, and say
// so plainly rather than pretending they live on the branded domain.
//
// Single responsibility: HTTP responses for these paths. No MCP/identity
// logic here — this is exactly the `routes` hook the shared server calls.
import { FACTS } from "./wixContent.mjs";

const BACKEND_ORIGIN = process.env.ISSUER || "https://wix.demo.busymate.ai";
const SITE_ORIGIN = process.env.WIX_SITE_ORIGIN || "https://mrserebano.wixsite.com/wren-and-oat";
const TENANT_SLUG = process.env.TENANT_SLUG || "wren-and-oat";

function text(res, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" }).end(body);
}

// A Wix Custom Element (a real, un-sandboxed customElements.define() tag Wix
// renders directly in the page — unlike an Embed HTML element, which is a
// lazy-loaded iframe that never fired its own load on the free plan; see
// sites/wix/README.md). This is the ONE file it loads: it defines the tag
// and, on connect, injects the same loader script every other demo uses.
function customElementJs() {
  return `class BusymateWidget extends HTMLElement {
  connectedCallback() {
    if (window.__busymateLoaded) return;
    window.__busymateLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://busymate.ai/embed/v1.js';
    s.async = true;
    s.setAttribute('data-assistant', '${TENANT_SLUG}');
    s.setAttribute('data-label', 'Ask us');
    document.head.appendChild(s);
  }
}
if (!customElements.get('busymate-widget')) {
  customElements.define('busymate-widget', BusymateWidget);
}
`;
}

function llmsTxt() {
  return `# Wren & Oat Bakery

> A bakery demo: a live Busymate AI assistant grounded in the bakery's own menu, hours, and story, an MCP server, a provided demo customer for testing the identified experience, and a place-an-order hand-off.

This is a Busymate AI integration demo — a working example, not a real business.
The real page lives on Wix's own hosting; this document and the files it
links live on this demo's OWN backend, because Wix's free plan cannot serve
a custom file at a path it doesn't already own.

## Pages
- [Wren & Oat Bakery](${SITE_ORIGIN}/): the bakery's real, published Wix site (home, menu, online orders, about, contact) — Markdown twin: ${BACKEND_ORIGIN}/index.md

## Talk to it
A live Busymate AI assistant answers questions about this bakery — menu, hours, and story.

## Act on it (agents)
This demo exposes an MCP server at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking. The tools:
- \`list_menu\` — Wren & Oat Bakery's menu (bread/pastry/coffee).
- \`get_hours\` — Opening hours.
- \`get_story\` — The bakery's story and what makes it different.
- \`search_menu\` — Search the menu for an item or category.
- \`site_status\` — Confirms the real site is live right now (a fresh fetch).
- \`place_order\` — Place a pickup order. Collects an email and what they want.
- \`who_is_signed_in\` — Who is signed in as a customer in this browser, if anyone. (identified visitors only)

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this demo mints itself — Wix Members Area sign-in isn't reachable from
a plain server-side backend, so this demo signs a provided customer in the
same way the ghost/webflow demos do. See https://busymate.ai/docs/guides/identified-visitors.

## Optional
- [agents.json](${BACKEND_ORIGIN}/agents.json): this demo's machine-readable card (name/url/tools/identity)
- [structured-data.json](${BACKEND_ORIGIN}/structured-data.json): JSON-LD for this business — NOT embedded in the Wix page's own \`<head>\` yet (that needs the site-wide embed, tracked separately for this demo)
- [MCP endpoint](${BACKEND_ORIGIN}/mcp): JSON-RPC 2.0 over HTTPS, open to anyone

## Sitemap
[sitemap.md](${BACKEND_ORIGIN}/sitemap.md)
`;
}

function agentsMd() {
  return `# AGENTS.md

## Project overview
Wren & Oat Bakery — a bakery demo: a live Busymate AI assistant grounded in the bakery's own menu, hours, and story, an MCP server over them, and a place-an-order hand-off.

## How an agent should read this site
Start at [llms.txt](${BACKEND_ORIGIN}/llms.txt). The real page is on Wix
(${SITE_ORIGIN}); this backend (${BACKEND_ORIGIN}) carries everything Wix's
free plan cannot host itself — the MCP server, the identity provider, and
this six-layer set, including an .md twin of the page at
[index.md](${BACKEND_ORIGIN}/index.md).

## Tools
See [agents.json](${BACKEND_ORIGIN}/agents.json) for the machine-readable tool list, or call \`tools/list\` on the MCP endpoint directly.
`;
}

async function sitemapMd() {
  return `# Sitemap\n\n- [Home](${SITE_ORIGIN}/)\n- [Menu](${SITE_ORIGIN}/menu)\n- [Online Orders](${SITE_ORIGIN}/online-orders)\n- [About](${SITE_ORIGIN}/about)\n- [Contact](${SITE_ORIGIN}/contact)\n`;
}

async function indexMd() {
  return `# ${FACTS.name}\n\n${FACTS.tagline}\n\n${FACTS.story}\n\n## Hours\n\n${FACTS.hours.map((h) => `- ${h.day}: ${h.hours}`).join("\n")}\n\n## Menu\n\n${FACTS.menu.map((s) => `### ${s.category}\n${s.items.map((i) => `- ${i}`).join("\n")}`).join("\n\n")}\n\nReal site: ${SITE_ORIGIN}\n`;
}

function agentsJson() {
  return JSON.stringify(
    {
      "$schema": "https://agentsjson.org/v0.1.0/schema.json",
      name: FACTS.name,
      url: SITE_ORIGIN,
      description: "A bakery demo, a Busymate AI integration example.",
      mcp_endpoint: `${BACKEND_ORIGIN}/mcp`,
      identity: {
        provider: `${BACKEND_ORIGIN}/api/identity/start`,
        note: "Wix Members Area isn't reachable from a plain server-side backend; this demo signs in one provided customer instead.",
      },
      tools: ["list_menu", "get_hours", "get_story", "search_menu", "site_status", "place_order", "who_is_signed_in"],
      human_handoff: true,
    },
    null,
    2,
  );
}

function structuredData() {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Bakery",
      name: FACTS.name,
      url: SITE_ORIGIN,
      description: FACTS.tagline + " A Busymate AI integration demo — not a real business.",
      areaServed: "Demo only",
    },
    null,
    2,
  );
}

/** The `routes` hook the shared identity server calls before its own 404. */
export async function serveWellKnown(req, res, url) {
  if (req.method !== "GET") return false;
  switch (url.pathname) {
    case "/custom-element.js":
      text(res, customElementJs(), "application/javascript; charset=utf-8");
      return true;
    case "/llms.txt":
      text(res, llmsTxt());
      return true;
    case "/AGENTS.md":
      text(res, agentsMd());
      return true;
    case "/sitemap.md":
      text(res, await sitemapMd(), "text/markdown; charset=utf-8");
      return true;
    case "/index.md":
      text(res, await indexMd(), "text/markdown; charset=utf-8");
      return true;
    case "/agents.json":
    case "/.well-known/agents.json":
      text(res, agentsJson(), "application/json; charset=utf-8");
      return true;
    case "/structured-data.json":
      text(res, structuredData(), "application/ld+json; charset=utf-8");
      return true;
    default:
      return false;
  }
}
