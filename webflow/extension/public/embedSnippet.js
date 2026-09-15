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
/** The tenant's public embed loader origin — never a raw provider URL. */
export function tenantOrigin(tenantSlug) {
    return `https://${tenantSlug}.busymate.ai`;
}
/** The exact `<script>` tag a customer would paste into Site Settings → Custom Code. */
export function embedScriptTag(opts) {
    var _a;
    const assistantName = (_a = opts.assistantName) !== null && _a !== void 0 ? _a : "your mate";
    return `<script src="${tenantOrigin(opts.tenantSlug)}/embed/v1.js" data-assistant="${opts.tenantSlug}" data-label="Ask ${assistantName}" async></script>`;
}
/** Full embed code, including the explanatory comment — what the Code Embed element holds. */
export function embedEmbedCode(opts) {
    return `<!-- Busymate assistant launcher, inserted by the Busymate Demo Connector app. -->\n${embedScriptTag(opts)}`;
}
