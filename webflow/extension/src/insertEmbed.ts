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

export type InsertMode = "html-embed" | "link-fallback";

export interface InsertResult {
  mode: InsertMode;
  /** Human-readable detail for the panel's status line. */
  detail: string;
}

/** Where a visitor lands when the embed can't run: the tenant's hosted chat. */
export function hostedChatUrl(tenantSlug: string): string {
  return `https://${tenantSlug}.busymate.ai/chat`;
}

async function findCodeSettingKey(element: {
  searchSettings: (options?: {valueType?: string}) => Promise<Record<string, unknown>>;
}): Promise<string | null> {
  const settings = await element.searchSettings({valueType: "code"});
  const keys = Object.keys(settings ?? {});
  return keys.length > 0 ? keys[0] : null;
}

/**
 * Insert the assistant embed at (or after) the anchor element. `anchor` is
 * whatever the panel resolved as the insertion point — the selected element,
 * or the page's root element when nothing is selected.
 */
export async function insertAssistantEmbed(
  webflowApi: typeof webflow,
  anchor: Awaited<ReturnType<typeof webflow.getSelectedElement>>,
  embedCode: string,
  tenantSlug: string
): Promise<InsertResult> {
  if (!anchor) {
    return {mode: "link-fallback", detail: "No insertion point (select an element, or add one to the page first)."};
  }

  // Path 1 — real HtmlEmbed element carrying our loader script.
  try {
    if (!("append" in anchor) || anchor.children !== true) {
      throw new Error("Selected element cannot contain a Code Embed — pick a container.");
    }
    const embed = await (anchor as unknown as {append: (preset: unknown) => Promise<AnyElementWithSettings>}).append(
      webflowApi.elementPresets.HtmlEmbed
    );
    const codeKey = await findCodeSettingKey(embed);
    if (!codeKey) {
      throw new Error("HtmlEmbed exposes no 'code' setting on this API version.");
    }
    await embed.setSettings({[codeKey]: embedCode});
    return {mode: "html-embed", detail: `Inserted a Code Embed element (setting "${codeKey}") with the loader script.`};
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);

    // Path 2 — fallback: a plain link to the tenant's hosted chat.
    try {
      const link = await (anchor as unknown as {append: (preset: unknown) => Promise<AnyLinkElement>}).append(
        webflowApi.elementPresets.TextLink
      );
      await link.setTextContent("Chat with us");
      await link.setSettings("url", hostedChatUrl(tenantSlug), {openInNewTab: true});
      return {
        mode: "link-fallback",
        detail: `Code Embed insert failed (${reason}) — inserted a "Chat with us" link to the hosted chat instead.`,
      };
    } catch (linkErr) {
      const linkReason = linkErr instanceof Error ? linkErr.message : String(linkErr);
      throw new Error(`Both insert paths failed. Embed: ${reason}. Link fallback: ${linkReason}.`);
    }
  }
}

/** Minimal shape this module actually calls — kept separate from the full generated typings. */
interface AnyElementWithSettings {
  setSettings(settings: Record<string, unknown>): Promise<null>;
  searchSettings(options?: {valueType?: string}): Promise<Record<string, unknown>>;
}

interface AnyLinkElement {
  setTextContent(text: string): Promise<null>;
  setSettings(
    mode: "url",
    target: string,
    metadata?: {openInNewTab?: boolean}
  ): Promise<null>;
}
