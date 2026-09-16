// sites/webflow/backend/wellKnown.mjs
//
// The six-layer agent-ready files (llms.txt, agents.json, sitemap.md,
// AGENTS.md, structured data, an .md twin of the page) for a demo whose
// real site (aldercroft-studio.webflow.io) is on Webflow's Starter plan —
// which cannot serve a custom static file at a path Webflow doesn't already
// own. So these are served from THIS backend's own domain instead, and say
// so plainly rather than pretending they live on the branded domain. Each
// route below is generated from the SAME live page fetch as the MCP tools
// (webflowContent.mjs) wherever the content is the page's own — never a
// second hand-typed copy.
//
// Single responsibility: HTTP responses for these paths. No MCP/identity
// logic here — this is exactly the `routes` hook the shared server calls.
import { fetchAllSections } from "./webflowContent.mjs";
// Relative to the FLATTENED Docker image layout this Dockerfile assembles
// (never the real repo tree — same convention index.mjs already uses for
// "./_shared/mcp-identity-server.mjs").
import { buildAgentsJson } from "./gen-agent-files.mjs";
import { TOOL_TABLE } from "./tools.mjs";

const BACKEND_ORIGIN = process.env.ISSUER || "https://webflow.demo.busymate.ai";
const SITE_ORIGIN = process.env.WEBFLOW_SITE_ORIGIN || "https://aldercroft-studio.webflow.io";
const TENANT_SLUG = process.env.TENANT_SLUG || "aldercroft-studio";
const DOCS = "https://busymate.ai/docs/guides";

function text(res, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" }).end(body);
}

function llmsTxt() {
  return `# Aldercroft Studio

> An architecture and design studio demo: a live Busymate AI assistant grounded in the studio's own published Webflow site, an MCP server over its services and properties, a provided demo client for testing the identified experience, and a request-a-consultation hand-off.

This is a Busymate AI integration demo — a working example, not a real business.
The real page lives on Webflow's own hosting; this document and the files it
links live on this demo's OWN backend, because Webflow's Starter plan cannot
serve a custom file at a path it doesn't already own.

## Pages
- [Aldercroft Studio](${SITE_ORIGIN}/): the studio's real, published Webflow site (about, properties, services, testimonials, contact) — Markdown twin: ${BACKEND_ORIGIN}/index.md

## Talk to it
A live Busymate AI assistant answers questions about this studio, grounded
only in the page's own published content, fetched fresh from Webflow.

## Act on it (agents)
This demo exposes an MCP server at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking. The tools:
- \`list_services\` — Aldercroft Studio's services, read live from the site.
- \`list_properties\` — The properties currently featured, read live from the site.
- \`search_content\` — Search the whole page (about/properties/services/testimonials/contact) for a query.
- \`get_studio_info\` — Contact details and office location, read live from the site.
- \`request_consultation\` — Request a property consultation. Collects an email and what they're interested in.
- \`who_is_signed_in\` — Who is signed in as a client in this browser, if anyone. (identified visitors only)

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this demo mints itself — Webflow Memberships is a paid-plan feature,
unavailable on Starter, so this demo signs a provided client in the same way
the scan/ghost demos do. See https://busymate.ai/docs/guides/identified-visitors.

## Optional
- [agents.json](${BACKEND_ORIGIN}/agents.json): this demo's machine-readable card (name/url/tools/identity)
- [structured-data.json](${BACKEND_ORIGIN}/structured-data.json): JSON-LD for this business — NOT embedded in the Webflow page's own \`<head>\` yet (that needs the site-wide embed or Designer Extension insert, both tracked separately for this demo)
- [MCP endpoint](${BACKEND_ORIGIN}/mcp): JSON-RPC 2.0 over HTTPS, open to anyone

## Sitemap
[sitemap.md](${BACKEND_ORIGIN}/sitemap.md)
`;
}

function agentsMd() {
  return `# AGENTS.md

## Project overview
Aldercroft Studio — an architecture and design studio demo: a live Busymate AI assistant grounded in the studio's own published Webflow site, an MCP server over its services and properties, and a request-a-consultation hand-off.

## How an agent should read this site
Start at [llms.txt](${BACKEND_ORIGIN}/llms.txt). The real page is on Webflow
(${SITE_ORIGIN}); this backend (${BACKEND_ORIGIN}) carries everything
Webflow's Starter plan cannot host itself — the MCP server, the identity
provider, and this six-layer set, including an .md twin of the page at
[index.md](${BACKEND_ORIGIN}/index.md).

## Installation
Nothing to install to READ this demo — every layer above is a plain HTTPS
GET, no credential. This demo's OWN embed (the site-wide loader script any
customer would paste into Site Settings → Custom Code) is documented, but
not live: Webflow's Starter plan gates Custom Code behind a paid site plan.
The native path — a Designer Extension inserting the same embed as a real
page element — is installed and connected, tracked separately.

## Configuration
This demo's MCP server is at \`${BACKEND_ORIGIN}/mcp\` (JSON-RPC 2.0, no auth to connect).

## Usage & examples
- \`list_services\`, \`list_properties\`, \`search_content\`, \`get_studio_info\` — public, read the site's own live content.
- \`request_consultation\` — public, records an intent (this demo takes no real appointment).
- \`who_is_signed_in\` — identified visitors only; needs a signed launch proof (see Identity above). A demo client (tenant slug \`${TENANT_SLUG}\`) is provided.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real
consultation is booked and the signed-in client is not a real person.
Nothing served here should be treated as production data.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
`;
}

async function sitemapMd() {
  const sections = await fetchAllSections().catch(() => ({}));
  const known = { about: "About", properties: "Properties", service: "Services", testimonial: "Testimonials", contact: "Contact" };
  const lines = [`# Sitemap — Aldercroft Studio`, "", `Single-page site (${SITE_ORIGIN}/), sections:`, ""];
  for (const [id, label] of Object.entries(known)) {
    if (sections[id]) lines.push(`- [${label}](${SITE_ORIGIN}/#${id})`);
  }
  return lines.join("\n") + "\n";
}

async function indexMd() {
  const sections = await fetchAllSections().catch(() => ({}));
  const known = { about: "About", properties: "Properties", service: "Services", testimonial: "Testimonials", contact: "Contact" };
  const lines = [`# Aldercroft Studio`, "", `Source: ${SITE_ORIGIN}/ (fetched live, not a hand-typed copy)`, ""];
  for (const [id, label] of Object.entries(known)) {
    if (sections[id]) lines.push(`## ${label}\n\n${sections[id]}\n`);
  }
  return lines.join("\n");
}

// busymate-devtools#3054: the merged v1 + agentsjson.org v0.1.0 + bespoke
// card shape — imported from the SAME generator every other demo's
// build-demo.sh calls, never a second hand-rolled copy of the shape (this
// function used to be exactly that: a THIRD, ad-hoc agents.json shape).
function agentsJson() {
  const doc = buildAgentsJson({
    siteUrl: BACKEND_ORIGIN,
    name: "Aldercroft Studio",
    description: "An architecture and design studio demo: a live Busymate AI assistant grounded in the studio's own published Webflow site, an MCP server over its services and properties, a provided demo client for testing the identified experience, and a request-a-consultation hand-off.",
    mcpUrl: `${BACKEND_ORIGIN}/mcp`,
    pages: [{ title: "Aldercroft Studio", url: `${SITE_ORIGIN}/`, note: "The studio's real, published Webflow site" }],
    docs: [
      { title: "Connect your MCP server as assistant tools", url: `${DOCS}/connect-mcp-server` },
      { title: "Recognise signed-in clients", url: `${DOCS}/identified-visitors` },
    ],
    identityDocsUrl: `${DOCS}/identified-visitors`,
    mcpTools: TOOL_TABLE,
  }, { hasLlmsFull: false });
  return JSON.stringify(doc, null, 2);
}

function structuredData() {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: "Aldercroft Studio",
      url: SITE_ORIGIN,
      description: "An architecture and design studio demo — a Busymate AI integration example, not a real business.",
      areaServed: "Demo only",
    },
    null,
    2
  );
}

/** The `routes` hook the shared identity server calls before its own 404. */
export async function serveWellKnown(req, res, url) {
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
    case "/index.md":
      text(res, await indexMd());
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
