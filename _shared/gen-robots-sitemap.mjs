// sites/_shared/gen-robots-sitemap.mjs
//
// robots.txt (naming the AI crawlers explicitly rather than leaving them to a
// wildcard) and sitemap.xml, pulled out of scripts/gen-content-pages.mjs so a
// demo with no content/*.md tree — a DYNAMIC demo served from its own backend
// (ghost, squarespace, webflow, wix, bigcommerce) — can build the SAME two
// files instead of hand-rolling a second copy (#3053, #3054).
export const AI_AGENTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
  "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot", "CCBot",
];

/** @param {string} origin e.g. https://ghost.demo.busymate.ai (no trailing slash) */
export function buildRobotsTxt(origin) {
  return `User-agent: *\nAllow: /\n\n`
    + `# A public demo: every AI crawler is named and allowed, rather than left to a wildcard.\n`
    + AI_AGENTS.map((a) => `User-agent: ${a}\nAllow: /`).join("\n\n")
    + `\n\nSitemap: ${origin}/sitemap.xml\n`;
}

/**
 * @param {{loc:string, priority?:number}[]} urls
 * @param {string} [today] YYYY-MM-DD; defaults to today
 */
export function buildSitemapXml(urls, today = new Date().toISOString().slice(0, 10)) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority ?? 0.5}</priority>\n  </url>`).join("\n")
    + `\n</urlset>\n`;
}
