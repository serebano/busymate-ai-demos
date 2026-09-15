var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Busymate Demo Connector — panel entry point.
 *
 * Wires the panel's one button to `insertAssistantEmbed`. No Designer-API
 * logic and no snippet-building logic here — both live in their own
 * single-purpose modules (`insertEmbed.ts`, `embedSnippet.ts`).
 */
import { embedEmbedCode } from "./embedSnippet.js";
import { insertAssistantEmbed } from "./insertEmbed.js";
import { reportBootStatus } from "./bootStatus.js";
const DEFAULT_TENANT_SLUG = "aldercroft-studio";
const tenantInput = document.getElementById("tenant-slug");
const statusEl = document.getElementById("status");
const insertButton = document.getElementById("insert-embed");
tenantInput.value = DEFAULT_TENANT_SLUG;
// Boot diagnostics first — never let a boot-time rejection stay silent.
void reportBootStatus(statusEl);
function setStatus(text, kind = "idle") {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
}
insertButton.addEventListener("click", () => {
    void handleInsertClick();
});
function handleInsertClick() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const tenantSlug = tenantInput.value.trim() || DEFAULT_TENANT_SLUG;
        insertButton.disabled = true;
        setStatus("Working…", "busy");
        try {
            const anchor = (_a = (yield webflow.getSelectedElement())) !== null && _a !== void 0 ? _a : (yield webflow.getRootElement());
            const code = embedEmbedCode({ tenantSlug });
            const result = yield insertAssistantEmbed(webflow, anchor, code, tenantSlug);
            setStatus(result.detail, result.mode === "html-embed" ? "ok" : "warn");
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setStatus(`Could not insert anything: ${message}`, "error");
        }
        finally {
            insertButton.disabled = false;
        }
    });
}
