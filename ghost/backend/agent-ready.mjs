// sites/ghost/backend/agent-ready.mjs
//
// The Meridian Line's own agent-ready layer (busymate-devtools#3027, #3053,
// #3054): the full six-layer set — /llms.txt + /llms-full.txt (dynamic, live
// off Ghost's own Content API), /agents.json (+ its .well-known twin, the
// v1 + agentsjson.org v0.1.0 + bespoke card merge, #3023 §4), AGENTS.md,
// sitemap.md/.xml, openapi.json, agent-permissions.json (+ twin),
// .well-known/mcp.json, .well-known/api-catalog, webmcp-catalog.json,
// robots.txt — and same-URL Markdown negotiation for the publication itself.
//
// WHY THIS LIVES HERE AND NOT IN GHOST. Ghost's own router 301s a bare
// `/llms.txt` or `/agents.json` to a trailing-slash URL and then 404s —
// there is no route for either, custom or built-in (audited live 2026-09-15,
// filed as #3027). `infra/nginx/ghost-https.conf.template` routes those two
// paths, `/.well-known/agents.json`, and any front-end request whose Accept
// header explicitly outranks `text/markdown` over `text/html` to THIS
// backend instead of the Ghost container — so this file is where all four
// of those actually get answered.
//
// Reads Ghost's OWN public Content API for the Markdown twin's body (never a
// second copy of the copy) — same principle as tools.mjs's `list_articles`.
// Relative to the FLATTENED image layout the Dockerfile copies into (this
// file lands at /app/agent-ready.mjs, the shared module at
// /app/_shared/agent-ready.mjs) — same convention index.mjs already uses
// for "./_shared/mcp-identity-server.mjs".
import { negotiatesMarkdown, markdownFrontmatter, htmlToMarkdownRough } from "./_shared/agent-ready.mjs";
import { buildStaticAgentFiles, serveStaticAgentFiles } from "./_gen/backend/agent-ready-static.mjs";
import ghostAgentConfig from "./agent-files.config.mjs";

const GHOST_ORIGIN = process.env.GHOST_CONTENT_API || "http://demo-ghost:2368";
const CONTENT_KEY = process.env.GHOST_CONTENT_API_KEY || "";

// The static half of the six-layer agent-ready set (busymate-devtools#3053,
// #3054): agents.json (the merged v1 + agentsjson.org v0.1.0 + bespoke card
// shape), AGENTS.md, sitemap.md/.xml, openapi.json, agent-permissions.json
// (+ its .well-known twin), .well-known/mcp.json, .well-known/api-catalog,
// webmcp-catalog.json, robots.txt — none of it depends on a live request, so
// it is built ONCE at cold start by the SAME generators every static demo's
// build-demo.sh calls (sites/_shared/gen-agent-files.mjs,
// sites/_shared/gen-protocol-files.mjs) — never a second hand-rolled copy.
// list_articles is the one tool this demo's OWN page registers over WebMCP
// (Code Injection — see README "The full-feature checklist"); honestly the
// only entry in webmcp-catalog.json, never a fabricated larger list.
const STATIC_FILES = buildStaticAgentFiles(ghostAgentConfig, {
  webmcpTools: [{
    name: "list_articles",
    title: "List Meridian Line articles",
    description: "The most recent articles published on The Meridian Line.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  }],
});
const serveStatic = serveStaticAgentFiles(STATIC_FILES);

async function contentFetch(path) {
  if (!CONTENT_KEY) return null;
  const sep = path.includes("?") ? "&" : "?";
  try {
    const res = await fetch(`${GHOST_ORIGIN}${path}${sep}key=${CONTENT_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const plain = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * @param {object} config
 * @param {string} config.issuer     e.g. https://ghost.demo.busymate.ai (no trailing slash)
 * @param {string} config.mcpUrl     e.g. https://ghost.demo.busymate.ai/mcp
 * @param {string} config.storeName  e.g. "The Meridian Line"
 * @param {string} config.tagline    One-line description.
 * @param {string} config.contactEmail
 * @returns {(req, res, url, ctx) => Promise<boolean>} A `routes` override
 *   for sites/_shared/backend/mcp-identity-server.mjs's `start()`.
 */
export function agentReadyRoutes({ issuer, mcpUrl, storeName, tagline, contactEmail }) {
  return async function routes(req, res, url) {
    if (req.method !== "GET") return false;

    if (url.pathname === "/llms.txt") {
      const posts = (await contentFetch("/ghost/api/content/posts/?limit=15&fields=title,excerpt,url,published_at"))?.posts || [];
      const lines = [`# ${storeName}`, "", `> ${tagline}`, "", "## Latest articles"];
      for (const p of posts) {
        const excerpt = plain(p.excerpt || "").slice(0, 200);
        lines.push(`- [${p.title}](${p.url})${excerpt ? `: ${excerpt}` : ""}`);
      }
      lines.push("", "## Contact", `- ${contactEmail}`, "", "## Assistant", `- MCP server: ${mcpUrl}`);
      res
        .writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=600" })
        .end(lines.join("\n") + "\n");
      return true;
    }

    if (url.pathname === "/llms-full.txt") {
      // Dynamic, not the static knowledge.json fallback: the magazine's most
      // recent articles, in full, read live off Ghost's own Content API —
      // never a second, hand-maintained copy that could go stale (same
      // principle as llms.txt's own live post list above).
      const posts = (await contentFetch("/ghost/api/content/posts/?limit=8&fields=title,html,url,published_at"))?.posts || [];
      const parts = [`# ${storeName}`, "", `Source: ${issuer}/`, "", `> ${tagline}`, "",
        "This is the magazine's most recent articles, in full, in one request — read live off its own Content API."];
      for (const p of posts) parts.push(`## ${p.title}\n\nSource: ${p.url}\n\n${htmlToMarkdownRough(p.html || "")}`);
      res
        .writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" })
        .end(parts.join("\n\n---\n\n") + "\n");
      return true;
    }

    // The static six-layer set built at cold start (see STATIC_FILES above):
    // agents.json (+ .well-known twin), AGENTS.md, sitemap.md/.xml,
    // openapi.json, agent-permissions.json (+ twin), .well-known/mcp.json,
    // .well-known/api-catalog, webmcp-catalog.json, robots.txt.
    if (await serveStatic(req, res, url)) return true;

    // Everything past this point only runs for a request nginx already
    // decided explicitly outranks text/markdown over text/html — the
    // `if ($http_accept ...)` branch in ghost-https.conf.template routes it
    // here instead of the Ghost container. Belt-and-braces: check again,
    // since a future caller of this module might not have that nginx guard.
    if (!negotiatesMarkdown(req.headers.accept)) return false;

    if (url.pathname === "/") {
      const settings = (await contentFetch("/ghost/api/content/settings/"))?.settings;
      const posts = (await contentFetch("/ghost/api/content/posts/?limit=10&fields=title,excerpt,url,published_at"))?.posts || [];
      const title = settings?.title || storeName;
      const description = settings?.description || tagline;
      const body = [`# ${title}`, "", description, "", "## Latest articles"];
      for (const p of posts) {
        const excerpt = plain(p.excerpt || "").slice(0, 200);
        body.push(`- [${p.title}](${p.url})${excerpt ? `: ${excerpt}` : ""}`);
      }
      const fm = markdownFrontmatter({
        title,
        description,
        canonical: `${issuer}/`,
        updated: posts[0]?.published_at,
        language: "en",
      });
      res
        .writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=300", Vary: "Accept" })
        .end(`${fm}\n\n${body.join("\n")}\n`);
      return true;
    }

    // Any other path: try it as a post, then a page, over Ghost's own
    // Content API — never a second, hand-maintained content source.
    const slug = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!slug) return false;
    for (const kind of ["posts", "pages"]) {
      const found = (
        await contentFetch(`/ghost/api/content/${kind}/slug/${encodeURIComponent(slug)}/?fields=title,excerpt,html,url,published_at,updated_at`)
      )?.[kind]?.[0];
      if (!found) continue;
      const fm = markdownFrontmatter({
        title: found.title,
        description: plain(found.excerpt || "").slice(0, 220),
        // NOT `found.url`: Ghost's own Content API can report a stale/wrong
        // `url` for a post (confirmed live 2026-09-15 — one post's `url` came
        // back "/404/" even though its real, rendered page canonicals
        // correctly; a Content-API-vs-router disagreement pre-dating this
        // fix). The URL this same request arrived on IS this page's
        // canonical, by construction of same-URL negotiation — never worth
        // trusting a second, possibly-stale source for it.
        canonical: `${issuer}${url.pathname}`,
        updated: found.updated_at || found.published_at,
        language: "en",
      });
      res
        .writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=300", Vary: "Accept" })
        .end(`${fm}\n\n${htmlToMarkdownRough(found.html || "")}`);
      return true;
    }
    return false;
  };
}
