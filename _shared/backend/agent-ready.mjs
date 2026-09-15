// sites/_shared/backend/agent-ready.mjs
//
// Small, dependency-free helpers a Node-backed demo needs for the Busymate
// Agent-Ready Web Standard v1 (scratchpad/agent-ready-standard/OWNER-SPEC.md,
// owner 2026-09-15, busymate-devtools#3027): the RFC 7231 §5.3.2 Accept
// quality-value check same-URL Markdown negotiation depends on, and its YAML
// frontmatter (title/description/canonical/updated/language, spec §2).
//
// One home so a second Node-backed demo (currently one — ghost, see
// sites/ghost/backend/agent-ready.mjs) reuses this rather than re-deriving
// logic the PHP twin already got right once (v2/integrations/wordpress/
// bmai-assistant/includes/class-bmai-markdown.php, busymate-devtools#3022).

/**
 * @param {string} accept Raw `Accept` header value.
 * @param {string} type   e.g. 'text/markdown'.
 * @returns {number|null} The highest `q` this type is listed at, or null.
 */
function bestQuality(accept, type) {
  const [family] = type.split("/");
  let best = null;
  for (const range of accept.split(",")) {
    const parts = range.trim().split(";");
    const media = parts[0].trim();
    if (media !== type && media !== `${family}/*` && media !== "*/*") continue;
    let q = 1;
    for (const part of parts.slice(1)) {
      const m = /^\s*q=([0-9.]+)\s*$/i.exec(part);
      if (m) q = Number(m[1]);
    }
    if (best === null || q > best) best = q;
  }
  return best;
}

/**
 * Does this request's `Accept` header explicitly outrank `text/markdown`
 * over `text/html`? No header at all (a browser navigation, most crawlers)
 * answers false — Markdown is opt-IN by the client asking for it, never a
 * surprise default. A tie (e.g. a bare wildcard `Accept`) also stays HTML,
 * the safer default for the far more common caller.
 *
 * @param {string|undefined} accept
 * @returns {boolean}
 */
export function negotiatesMarkdown(accept) {
  const value = String(accept ?? "").trim();
  if (!value) return false;
  const qMarkdown = bestQuality(value, "text/markdown");
  if (qMarkdown === null) return false;
  const qHtml = bestQuality(value, "text/html");
  return qHtml === null ? true : qMarkdown > qHtml;
}

const yamlScalar = (value) =>
  `"${String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')}"`;

/**
 * A small YAML-ish frontmatter block — owner spec §2's Markdown
 * representation requirement (title/description/canonical/updated/language).
 *
 * @param {{title:string, description?:string, canonical:string, updated?:string, language?:string}} meta
 * @returns {string} Ends with the closing `---` line, no trailing blank line.
 */
export function markdownFrontmatter({ title, description, canonical, updated, language = "en" }) {
  const lines = ["---", `title: ${yamlScalar(title)}`];
  if (description) lines.push(`description: ${yamlScalar(description)}`);
  lines.push(`canonical: ${yamlScalar(canonical)}`);
  lines.push(`updated: ${yamlScalar(updated || new Date().toISOString())}`);
  lines.push(`language: ${yamlScalar(language)}`);
  lines.push("---");
  return lines.join("\n");
}

/**
 * @param {string} html
 * @returns {string} Tags stripped, common entities decoded, whitespace tidied.
 */
function stripTags(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * A small, dependency-free HTML -> Markdown pass — good enough for a CMS's
 * own rendered post/page body, not a general-purpose converter. Unrecognised
 * tags are simply stripped, so output degrades to plain text rather than
 * leaking markup (same posture as the PHP twin's `to_markdown()`).
 *
 * @param {string} html Raw rendered HTML body.
 * @returns {string}
 */
export function htmlToMarkdownRough(html) {
  let out = String(html ?? "");
  out = out.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n, body) => `\n${"#".repeat(Number(n))} ${stripTags(body)}\n`);
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_");
  out = out.replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|ul|ol|blockquote|figure)>/gi, "\n\n");
  out = stripTags(out);
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}
