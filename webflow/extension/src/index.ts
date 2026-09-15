/**
 * Busymate Demo Connector — panel entry point.
 *
 * Wires the panel's one button to `insertAssistantEmbed`. No Designer-API
 * logic and no snippet-building logic here — both live in their own
 * single-purpose modules (`insertEmbed.ts`, `embedSnippet.ts`).
 */
import {embedEmbedCode} from "./embedSnippet.js";
import {insertAssistantEmbed} from "./insertEmbed.js";
import {reportBootStatus} from "./bootStatus.js";

const DEFAULT_TENANT_SLUG = "aldercroft-studio";

const tenantInput = document.getElementById("tenant-slug") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const insertButton = document.getElementById("insert-embed") as HTMLButtonElement;

tenantInput.value = DEFAULT_TENANT_SLUG;

// Boot diagnostics first — never let a boot-time rejection stay silent.
void reportBootStatus(statusEl);

function setStatus(text: string, kind: "idle" | "busy" | "ok" | "warn" | "error" = "idle") {
  statusEl.textContent = text;
  statusEl.dataset.kind = kind;
}

insertButton.addEventListener("click", () => {
  void handleInsertClick();
});

async function handleInsertClick(): Promise<void> {
  const tenantSlug = tenantInput.value.trim() || DEFAULT_TENANT_SLUG;
  insertButton.disabled = true;
  setStatus("Working…", "busy");

  try {
    const anchor = (await webflow.getSelectedElement()) ?? (await webflow.getRootElement());
    const code = embedEmbedCode({tenantSlug});
    const result = await insertAssistantEmbed(webflow, anchor, code, tenantSlug);
    setStatus(result.detail, result.mode === "html-embed" ? "ok" : "warn");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(`Could not insert anything: ${message}`, "error");
  } finally {
    insertButton.disabled = false;
  }
}
