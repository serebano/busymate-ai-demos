// sites/squarespace/backend/wellKnown.mjs
//
// The six-layer agent-ready files for a demo whose real site (the owner's
// Squarespace trial site) cannot serve a custom static file at a path
// Squarespace doesn't already own, and is Password Protected on trial (no
// anonymous crawler reaches it at all — see README.md). Served from THIS
// backend's own domain instead, same shape as sites/bigcommerce/backend/
// wellKnown.mjs. The content is generated from the SAME live page read the
// MCP tools use (squarespace.mjs) — never a second hand-typed copy.
import { allPages, apiReady } from "./squarespace.mjs";
// Relative to the FLATTENED Docker image layout (this file lands at
// /app/wellKnown.mjs; the Dockerfile places gen-agent-files.mjs and
// agent-files.config.mjs alongside it at /app/) — same convention
// index.mjs already uses for "./_shared/mcp-identity-server.mjs". These
// backend .mjs files are never run directly from the repo tree, only inside
// the image the Dockerfile assembles.
import { buildStaticAgentFiles, serveStaticAgentFiles } from "./_shared/agent-ready-static.mjs";
import agentFilesConfig from "./agent-files.config.mjs";

// The static six-layer set (busymate-devtools#3054, #3064): agents.json
// (the merged v1 + agentsjson.org v0.1.0 + bespoke card shape — this demo's
// OWN agents.json used to be the "third, ad-hoc shape" #3054 named),
// openapi.json, agent-permissions.json (+ twin), .well-known/mcp.json,
// .well-known/api-catalog, webmcp-catalog.json, robots.txt, sitemap.xml —
// none of it depends on a live request, so it is built ONCE at cold start by
// the SAME generators every static demo's build-demo.sh calls — never a
// second hand-rolled copy. get_page is the one tool this demo's OWN preview
// page genuinely registers over WebMCP (see homePage() below); honestly the
// only entry in webmcp-catalog.json.
const STATIC_FILES = buildStaticAgentFiles(agentFilesConfig, {
  webmcpTools: [{
    name: "get_page",
    title: "Read a Quiet Pines Yoga page",
    description: "Read one live page of the Quiet Pines Yoga site (Home/About/Services/Appointments/Contact).",
    inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false },
    annotations: { readOnlyHint: true },
  }],
});
const serveStatic = serveStaticAgentFiles(STATIC_FILES);

const BACKEND_ORIGIN = process.env.SQSP_DEMO_ORIGIN || "https://squarespace.demo.busymate.ai";
const SITE_ORIGIN = process.env.SQSP_SITE_ORIGIN || "https://bat-vanilla-s2x4.squarespace.com";
const TENANT_SLUG = process.env.TENANT_SLUG || "demo-squarespace";
const JWKS_URL = `${BACKEND_ORIGIN}/.well-known/jwks.json`;
const DELEGATED_TOOLS = ["book_a_session"];

const actorVerifierConfigured = () => Boolean(
  process.env.BMAI_SUPPORT_ACTOR_SECRET
  && process.env.BMAI_SUPPORT_TENANT_ID
  && process.env.BMAI_SUPPORT_CONNECTOR_ID
  && (process.env.BMAI_SUPPORT_AUDIENCE || BACKEND_ORIGIN),
);

let identityCache = { at: 0, ok: false };
async function identityConfigured() {
  if (Date.now() - identityCache.at < 60_000) return identityCache.ok;
  let ok = false;
  try {
    const res = await fetch(JWKS_URL, { headers: { accept: "application/json" } });
    const body = res.ok ? await res.json() : null;
    ok = Array.isArray(body?.keys) && body.keys.length > 0;
  } catch { ok = false; }
  identityCache = { at: Date.now(), ok };
  return ok;
}

async function serveStatus(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, OPTIONS",
    }).end();
    return;
  }
  const body = {
    identity: await identityConfigured(),
    actorVerifier: actorVerifierConfigured(),
    launchTtlSec: 120,
    tools: actorVerifierConfigured() && apiReady ? DELEGATED_TOOLS : [],
    identityEndpoint: `${BACKEND_ORIGIN}/api/identity/start`,
    jwksUri: JWKS_URL,
    siteAvailability: "password_protected",
  };
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  }).end(JSON.stringify(body));
}

function text(res, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" }).end(body);
}

function llmsTxt() {
  return `# Quiet Pines Yoga

> A boutique yoga studio demo on a real Squarespace trial site: a live Busymate AI assistant grounded in the studio's own published pages, an MCP server over its live site content, a provided demo visitor for testing the identified experience, and a request-a-human hand-off.

This is a Busymate AI integration demo — a working example, not a real business.
The real site runs on Squarespace's own hosting and is Password Protected while
on the free trial (Public availability needs a paid plan — see README.md); this
document and the files it links live on this demo's OWN backend, because a
Squarespace trial site cannot serve a custom file at a path it doesn't already
own, and an anonymous crawler cannot reach the site itself at all right now.

## Pages
- [Quiet Pines Yoga](${SITE_ORIGIN}/): the studio's real, live Squarespace trial site (Home, About, Services, Appointments, Contact) — password protected on trial.

## Talk to it
A live Busymate AI assistant answers questions about this studio, grounded
only in the studio's own published pages, read fresh off the live site.

## Act on it (agents)
This demo exposes an MCP server at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking. The tools:
- \`get_page\` — read one live page (Home/About/Services/Appointments/Contact).
- \`search_site\` — search every live page for a word or phrase.
- \`list_booking_options\` — the studio session options on the live Appointments page.
- \`book_a_session\` — start booking a session. (identified visitors only)

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this demo mints itself for ONE provided demo visitor (Sasha Moreau) —
Squarespace's Member Areas is a native-site integration tracked separately;
this demo signs a provided visitor in the same way the shopify/scan/ghost
demos do. See https://busymate.ai/docs/guides/identified-visitors.

## Optional
- [agents.json](${BACKEND_ORIGIN}/agents.json): this demo's machine-readable card
- [structured-data.json](${BACKEND_ORIGIN}/structured-data.json): JSON-LD for this studio
- [MCP endpoint](${BACKEND_ORIGIN}/mcp): JSON-RPC 2.0 over HTTPS, open to anyone

## Sitemap
[sitemap.md](${BACKEND_ORIGIN}/sitemap.md)
`;
}

function agentsMd() {
  return `# AGENTS.md

## Project overview
Quiet Pines Yoga — a boutique yoga studio demo on a real Squarespace trial site: a live Busymate AI assistant grounded in the studio's own published pages, an MCP server over its live site content, and a request-a-human hand-off.

## How an agent should read this site
Start at [llms.txt](${BACKEND_ORIGIN}/llms.txt). The real site is on
Squarespace (${SITE_ORIGIN}, Password Protected on trial); this backend
(${BACKEND_ORIGIN}) carries everything Squarespace cannot host itself on a
free trial — the MCP server, the identity provider, and this six-layer set.

## Installation
Nothing to install to READ this demo — every layer above is a plain HTTPS
GET, no credential. This demo's universal embed (Squarespace Code Block /
Embed Block) is documented in README.md, including which plan tier each
mechanism actually renders on. The native path — a registered Squarespace
Extension (developers.squarespace.com, OAuth) — is tracked separately in
README.md.

## Configuration
This demo's MCP server is at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0, no auth to connect).

## Usage & examples
- \`get_page\`, \`search_site\`, \`list_booking_options\` — public, read the studio's own live pages.
- \`book_a_session\` — identified visitors only; needs a signed launch proof (see Identity above). A demo visitor (tenant slug \`${TENANT_SLUG}\`) is provided.

## Security considerations
This is a Busymate AI integration demo, not a real business: the signed-in
visitor is not a real person, though the pages behind it are real, live
pages on a real (trial) Squarespace site.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
`;
}

async function sitemapMd() {
  const { pages } = await allPages().catch(() => ({ pages: [] }));
  const lines = [`# Sitemap — Quiet Pines Yoga`, "", `Site: [${SITE_ORIGIN}](${SITE_ORIGIN}/)`, "", `## Pages`, ""];
  for (const p of pages) lines.push(`- [${p.title}](${SITE_ORIGIN}${p.path})`);
  return lines.join("\n") + "\n";
}

async function structuredData() {
  const { pages } = await allPages().catch(() => ({ pages: [] }));
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "ExerciseGym",
      name: "Quiet Pines Yoga",
      url: SITE_ORIGIN,
      description: "A boutique yoga studio demo — a Busymate AI integration example, not a real business.",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Pages",
        itemListElement: pages.map((p) => ({ "@type": "WebPage", name: p.title, url: `${SITE_ORIGIN}${p.path}` })),
      },
    },
    null,
    2
  );
}

// This backend's own homepage — served at BOTH "/" and "/preview". The real
// trial site is Password Protected right now (needs the site's own
// password, or a paid upgrade to go Public), so identity, the widget AND
// the discovery links this repo's own check-agent-files.sh looks for
// (busymate-devtools#3064: squarespace.demo.busymate.ai answered 404 at "/"
// because no route here ever served one) are all proven HERE, on this
// backend's own origin — same embed tag, same window.BusymateAI.getIdentity
// wiring (defined BEFORE the embed script per the identified-visitors doc),
// and a REAL WebMCP registration of get_page (not just described in
// webmcp-catalog.json — genuinely registered in this page).
function homePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Quiet Pines Yoga — preview</title>
<link rel="webmcp-catalog" href="/webmcp-catalog.json">
<link rel="alternate" type="application/json" href="/.well-known/agents.json">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ExerciseGym","name":"Quiet Pines Yoga","url":"${SITE_ORIGIN}","description":"A boutique yoga studio demo — a Busymate AI integration example, not a real business."}
</script>
</head>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px">
<h1>Quiet Pines Yoga (preview)</h1>
<p>Same-origin proof page: the real site is Password Protected right now
(Public needs a paid Squarespace plan). This page carries the identical
embed + identity wiring the real Code Block / Embed Block tag uses.</p>
<p id="status">not signed in</p>
<button id="signin">Sign in as Sasha Moreau (demo visitor)</button>
<p style="font-size:13px;opacity:.75">Editorial contact: <a href="mailto:hello@quietpinesyoga.example">hello@quietpinesyoga.example</a></p>
<script>
  window.BusymateAI = window.BusymateAI || {};
  window.BusymateAI.getIdentity = async function () {
    var r = await fetch("/api/identity/session", { credentials: "include" });
    var j = await r.json();
    return j.signedIn ? j.customer : null;
  };
  document.getElementById("signin").addEventListener("click", async function () {
    await fetch("/api/identity/login", { method: "POST", credentials: "include" });
    document.getElementById("status").textContent = "signed in — ask the chat to book a session";
    if (window.BusymateAI.refreshIdentity) window.BusymateAI.refreshIdentity();
  });
  (function () {
    function waitForSdk(t) { var s = Date.now(); return new Promise(function (res) { (function poll() {
      if (window.BusymateAI && typeof window.BusymateAI.registerPageTools === "function") { res(true); return; }
      if (Date.now() - s > (t || 15000)) { res(false); return; } setTimeout(poll, 150);
    })(); }); }
    waitForSdk().then(function (ok) { if (!ok) return;
      window.BusymateAI.registerPageTools([{
        name: "get_page", title: "Read a Quiet Pines Yoga page",
        description: "Read one live page of the Quiet Pines Yoga site (Home/About/Services/Appointments/Contact).",
        inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: function (args) {
          return fetch("/mcp", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_page", arguments: args || {} } }) })
            .then(function (r) { return r.json(); })
            .then(function (d) { return JSON.parse(d.result.content[0].text); });
        },
      }]);
    });
  })();
</script>
<script src="https://busymate.ai/embed/v1.js" data-assistant="demo-squarespace" data-label="Chat with us" async></script>
</body></html>`;
}

/** The `routes` hook the shared identity server calls before its own 404. */
export async function serveWellKnown(req, res, url) {
  if (url.pathname === "/api/bmai/status") {
    await serveStatus(req, res);
    return true;
  }
  // "/" and "/preview" are the SAME homepage (busymate-devtools#3064: this
  // backend IS the whole demo — squarespace.demo.busymate.ai/ answering 404
  // is not an honest state for a manifest row marked "live").
  if ((url.pathname === "/preview" || url.pathname === "/") && req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(homePage());
    return true;
  }
  if (req.method !== "GET") return false;
  switch (url.pathname) {
    case "/llms.txt":
      text(res, llmsTxt());
      return true;
    case "/AGENTS.md":
      text(res, agentsMd());
      return true;
    case "/sitemap.md":
      text(res, await sitemapMd());
      return true;
    case "/structured-data.json":
      text(res, await structuredData(), "application/ld+json; charset=utf-8");
      return true;
    default:
      // The static six-layer set built at cold start (see STATIC_FILES
      // above): agents.json (+ .well-known twin), openapi.json,
      // agent-permissions.json (+ twin), .well-known/mcp.json,
      // .well-known/api-catalog, webmcp-catalog.json, robots.txt, sitemap.xml.
      return serveStatic(req, res, url);
  }
}
