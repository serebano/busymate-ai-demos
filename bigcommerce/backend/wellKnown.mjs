// sites/bigcommerce/backend/wellKnown.mjs
//
// The six-layer agent-ready files for a demo whose real site
// (the owner's BigCommerce trial storefront) cannot serve a custom static
// file at a path BigCommerce doesn't already own. Served from THIS
// backend's own domain instead, same shape as sites/webflow/backend/
// wellKnown.mjs. The content is generated from the SAME live catalogue read
// the MCP tools use (bigcommerce.mjs) — never a second hand-typed copy.
import { catalogue, categories, apiReady } from "./bigcommerce.mjs";

const BACKEND_ORIGIN = process.env.BC_DEMO_ORIGIN || "https://bigcommerce.demo.busymate.ai";
const SITE_ORIGIN = process.env.BC_SITE_ORIGIN || "https://12zero784.mybigcommerce.com";
const TENANT_SLUG = process.env.TENANT_SLUG || "demo-bigcommerce";
const JWKS_URL = `${BACKEND_ORIGIN}/.well-known/jwks.json`;
const DELEGATED_TOOLS = ["list_my_orders", "get_order_status"];

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
  return `# Copperfield Kitchen Co.

> A kitchenware retailer demo on a real BigCommerce store: a live Busymate AI assistant grounded in the store's own catalogue, an MCP server over its live products and orders, a provided demo customer for testing the identified experience, and a request-a-human hand-off.

This is a Busymate AI integration demo — a working example, not a real business.
The real storefront runs on BigCommerce's own hosting; this document and the
files it links live on this demo's OWN backend, because a BigCommerce
storefront cannot serve a custom file at a path it doesn't already own.

## Pages
- [Copperfield Kitchen Co.](${SITE_ORIGIN}/): the store's real, live BigCommerce storefront (cookware, bakeware, kitchen tools, tabletop & dining, storage).

## Talk to it
A live Busymate AI assistant answers questions about this store, grounded
only in the store's own published catalogue, read fresh from the BigCommerce
Admin API.

## Act on it (agents)
This demo exposes an MCP server at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking. The tools:
- \`search_products\` — search the live catalogue by query, category, price or stock.
- \`get_product\` — everything published about one product, by SKU or name.
- \`get_delivery_and_returns\` — delivery zones, cost and the category list.
- \`list_my_orders\` — every order on the signed-in customer's account. (identified visitors only)
- \`get_order_status\` — where a signed-in customer's order has got to. (identified visitors only)

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this demo mints itself for ONE provided demo customer (Daniel Weber) —
BigCommerce's real Customer Login API is a native-storefront integration
tracked separately; this demo signs a provided customer in the same way the
shopify/scan/ghost demos do. See https://busymate.ai/docs/guides/identified-visitors.

## Optional
- [agents.json](${BACKEND_ORIGIN}/agents.json): this demo's machine-readable card
- [structured-data.json](${BACKEND_ORIGIN}/structured-data.json): JSON-LD for this store
- [MCP endpoint](${BACKEND_ORIGIN}/mcp): JSON-RPC 2.0 over HTTPS, open to anyone

## Sitemap
[sitemap.md](${BACKEND_ORIGIN}/sitemap.md)
`;
}

function agentsMd() {
  return `# AGENTS.md

## Project overview
Copperfield Kitchen Co. — a kitchenware retailer demo on a real BigCommerce store: a live Busymate AI assistant grounded in the store's own catalogue, an MCP server over its live products and orders, and a request-a-human hand-off.

## How an agent should read this site
Start at [llms.txt](${BACKEND_ORIGIN}/llms.txt). The real storefront is on
BigCommerce (${SITE_ORIGIN}); this backend (${BACKEND_ORIGIN}) carries
everything BigCommerce cannot host itself — the MCP server, the identity
provider, and this six-layer set.

## Installation
Nothing to install to READ this demo — every layer above is a plain HTTPS
GET, no credential. This demo's universal embed (a script pasted into
Storefront → Script Manager) is documented and live on the real storefront.
The native path — a single-click BigCommerce app (OAuth install, Scripts +
Widgets API) — is tracked separately.

## Configuration
This demo's MCP server is at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0, no auth to connect).

## Usage & examples
- \`search_products\`, \`get_product\`, \`get_delivery_and_returns\` — public, read the store's own live catalogue.
- \`list_my_orders\`, \`get_order_status\` — identified visitors only; needs a signed launch proof (see Identity above). A demo customer (tenant slug \`${TENANT_SLUG}\`) is provided.

## Security considerations
This is a Busymate AI integration demo, not a real business: the signed-in
customer is not a real person, though the products and orders behind it are
real rows on a real (trial) BigCommerce store.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
`;
}

async function sitemapMd() {
  const cats = await categories().catch(() => ({ categories: [] }));
  const lines = [`# Sitemap — Copperfield Kitchen Co.`, "", `Storefront (${SITE_ORIGIN}/), categories:`, ""];
  for (const c of cats.categories ?? []) lines.push(`- ${c.name}`);
  return lines.join("\n") + "\n";
}

function agentsJson() {
  return JSON.stringify(
    {
      "$schema": "https://agentsjson.org/v0.1.0/schema.json",
      name: "Copperfield Kitchen Co.",
      url: SITE_ORIGIN,
      description: "A kitchenware retailer demo on a real BigCommerce store, a Busymate AI integration example.",
      mcp_endpoint: `${BACKEND_ORIGIN}/mcp`,
      identity: {
        provider: `${BACKEND_ORIGIN}/api/identity/start`,
        note: "One provided demo customer (Daniel Weber) is signed in; BigCommerce's real Customer Login API integration is tracked separately.",
      },
      tools: ["search_products", "get_product", "get_delivery_and_returns", "list_my_orders", "get_order_status"],
      human_handoff: true,
    },
    null,
    2
  );
}

async function structuredData() {
  const rows = await catalogue().catch(() => []);
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name: "Copperfield Kitchen Co.",
      url: SITE_ORIGIN,
      description: "A kitchenware retailer demo — a Busymate AI integration example, not a real business.",
      makesOffer: rows.slice(0, 12).map((p) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Product", name: p.name, sku: p.sku },
        price: p.price,
        priceCurrency: "USD",
      })),
    },
    null,
    2
  );
}

// A minimal, same-origin verification page: the real storefront is
// BigCommerce "prelaunch" right now (Coming Soon gate, control-panel-only to
// lift), so identity + the widget are proven HERE, on this backend's own
// origin, exactly the shape the real Script Manager embed will use once the
// store launches — same embed tag, same window.BusymateAI.getIdentity wiring,
// defined BEFORE the embed script per the identified-visitors doc.
function previewPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Copperfield Kitchen Co. — preview</title></head>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px">
<h1>Copperfield Kitchen Co. (preview)</h1>
<p>Same-origin proof page: the real storefront is BigCommerce "prelaunch" right now
(needs the control-panel Launch step). This page carries the identical embed +
identity wiring the real Storefront Script Manager tag uses.</p>
<p id="status">not signed in</p>
<button id="signin">Sign in as Daniel Weber (demo customer)</button>
<script>
  window.BusymateAI = window.BusymateAI || {};
  window.BusymateAI.getIdentity = async function () {
    var r = await fetch("/api/identity/session", { credentials: "include" });
    var j = await r.json();
    return j.signedIn ? j.customer : null;
  };
  document.getElementById("signin").addEventListener("click", async function () {
    await fetch("/api/identity/login", { method: "POST", credentials: "include" });
    document.getElementById("status").textContent = "signed in — ask the chat about order 101";
    if (window.BusymateAI.refreshIdentity) window.BusymateAI.refreshIdentity();
  });
</script>
<script src="https://busymate.ai/embed/v1.js" data-assistant="demo-bigcommerce" data-label="Chat with us" async></script>
</body></html>`;
}

/** The `routes` hook the shared identity server calls before its own 404. */
export async function serveWellKnown(req, res, url) {
  if (url.pathname === "/api/bmai/status") {
    await serveStatus(req, res);
    return true;
  }
  if (url.pathname === "/preview" && req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(previewPage());
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
    case "/agents.json":
    case "/.well-known/agents.json":
      text(res, agentsJson(), "application/json; charset=utf-8");
      return true;
    case "/structured-data.json":
      text(res, await structuredData(), "application/ld+json; charset=utf-8");
      return true;
    default:
      return false;
  }
}
