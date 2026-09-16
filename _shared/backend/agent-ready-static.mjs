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
