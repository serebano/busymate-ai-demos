/**
 * Busymate Demo Connector — insertion logic.
 *
 * The delivery mechanism for the "site-wide custom code" embed (task 2a) on a
 * Webflow plan where Site Settings → Custom Code is paid-gated: the Designer
 * Extension inserts a real `HtmlEmbed` element via the Designer API (this
 * runs INSIDE the Designer, under the signed-in owner's own session — it is
 * not the Custom Code feature and isn't gated by it).
 *
 * Two paths, tried in order, both real (never a fabricated "done"):
 *  1. Insert an `HtmlEmbed` element and set its raw-code setting to our
 *     `<script>` loader tag. The exact settings key for an embed's code is
 *     discovered at runtime via `searchSettings({valueType: "code"})` rather
 *     than hard-coded, so a Designer API version drift doesn't silently write
 *     the wrong key.
 *  2. If the API refuses (see `InsertResult.mode === "link-fallback"`), insert
 *     a plain `Link` element reading "Chat with us" that points at the
 *     tenant's hosted chat page instead — a real, working affordance, just
 *     not the floating widget.
 *
 * Single responsibility: perform the insert, report what actually happened.
 * No UI code in this file.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/** Where a visitor lands when the embed can't run: the tenant's hosted chat. */
export function hostedChatUrl(tenantSlug) {
    return `https://${tenantSlug}.busymate.ai/chat`;
}
function findCodeSettingKey(element) {
    return __awaiter(this, void 0, void 0, function* () {
        const settings = yield element.searchSettings({ valueType: "code" });
        const keys = Object.keys(settings !== null && settings !== void 0 ? settings : {});
        return keys.length > 0 ? keys[0] : null;
    });
}
/**
 * Insert the assistant embed at (or after) the anchor element. `anchor` is
 * whatever the panel resolved as the insertion point — the selected element,
 * or the page's root element when nothing is selected.
 */
export function insertAssistantEmbed(webflowApi, anchor, embedCode, tenantSlug) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!anchor) {
            return { mode: "link-fallback", detail: "No insertion point (select an element, or add one to the page first)." };
        }
        // Path 1 — real HtmlEmbed element carrying our loader script.
        try {
            if (!("append" in anchor) || anchor.children !== true) {
                throw new Error("Selected element cannot contain a Code Embed — pick a container.");
            }
            const embed = yield anchor.append(webflowApi.elementPresets.HtmlEmbed);
            const codeKey = yield findCodeSettingKey(embed);
            if (!codeKey) {
                throw new Error("HtmlEmbed exposes no 'code' setting on this API version.");
            }
            yield embed.setSettings({ [codeKey]: embedCode });
            return { mode: "html-embed", detail: `Inserted a Code Embed element (setting "${codeKey}") with the loader script.` };
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            // Path 2 — fallback: a plain link to the tenant's hosted chat.
            try {
                const link = yield anchor.append(webflowApi.elementPresets.TextLink);
                yield link.setTextContent("Chat with us");
                yield link.setSettings("url", hostedChatUrl(tenantSlug), { openInNewTab: true });
                return {
                    mode: "link-fallback",
                    detail: `Code Embed insert failed (${reason}) — inserted a "Chat with us" link to the hosted chat instead.`,
                };
            }
            catch (linkErr) {
                const linkReason = linkErr instanceof Error ? linkErr.message : String(linkErr);
                throw new Error(`Both insert paths failed. Embed: ${reason}. Link fallback: ${linkReason}.`);
            }
        }
    });
}
