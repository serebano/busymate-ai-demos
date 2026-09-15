/**
 * Busymate Demo Connector — embed snippet builder.
 *
 * Mirrors the SAME shape the product's own docs snippet builder emits
 * (`v2/apps/web/lib/integration/snippets.ts` → `embedScriptSnippet`), trimmed
 * to the anonymous-chat case: a customer who installs the app is not hand
 * -typing this — it's inserted for them, so it stays the plain, no-identity
 * form (identified sign-in is a documented follow-up, not faked here).
 *
 * Single responsibility: build the string. No Designer API calls in this file.
 */

export interface EmbedSnippetOptions {
  /** The tenant's slug on busymate.ai (its embed host is `https://<slug>.busymate.ai`). */
  tenantSlug: string;
  /** The public assistant display name — lowercase "your mate" unless a tenant overrides it. */
  assistantName?: string;
}

/** The tenant's public embed loader origin — never a raw provider URL. */
export function tenantOrigin(tenantSlug: string): string {
  return `https://${tenantSlug}.busymate.ai`;
}

/** The exact `<script>` tag a customer would paste into Site Settings → Custom Code. */
export function embedScriptTag(opts: EmbedSnippetOptions): string {
  const assistantName = opts.assistantName ?? "your mate";
  return `<script src="${tenantOrigin(opts.tenantSlug)}/embed/v1.js" data-assistant="${opts.tenantSlug}" data-label="Ask ${assistantName}" async></script>`;
}

/** Full embed code, including the explanatory comment — what the Code Embed element holds. */
export function embedEmbedCode(opts: EmbedSnippetOptions): string {
  return `<!-- Busymate assistant launcher, inserted by the Busymate Demo Connector app. -->\n${embedScriptTag(opts)}`;
}
