/*
 * What this page can do, published as tools.
 *
 * The descriptors live in page-tools.data.js; this file gives each one the
 * function that runs it — the SAME functions the on-page URL field and the
 * example cards call, so a tool can never do anything a visitor could not.
 */
import { TOOL_SPECS } from "./page-tools.data.js";
import { getReadiness, launchQuickstart, listExamples, revealExample } from "./boot-actions.js";

const EXECUTE = {
  scan_site: async ({ url }) => launchQuickstart(url),
  list_examples: async () => ({ examples: listExamples() }),
  show_example: async ({ site }) => revealExample(site),
  get_readiness: async ({ url }) => getReadiness(url),
};

export const TOOLS = TOOL_SPECS.map((spec) => ({ ...spec, execute: EXECUTE[spec.name] }));

/**
 * Register, and SAY SO. registerPageTools validates every property of every
 * inputSchema — one missing `description` rejects the whole call — and an
 * un-awaited promise turns that into zero tools with no visible error. So this
 * awaits it, reports what registered, and logs a rejection loudly.
 */
/** The embed script loads `async`, so it may not have defined the API yet. */
async function waitForSdk(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (typeof window.BusymateAI?.registerPageTools === "function") return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

export async function register() {
  if (!(await waitForSdk())) return { ok: false, reason: "sdk_absent" };
  try {
    await window.BusymateAI.registerPageTools(TOOLS);
    const live = globalThis.document?.modelContext?.getTools?.() ?? null;
    return { ok: true, registered: TOOLS.map((t) => t.name), nativeToolCount: live ? live.length : null };
  } catch (error) {
    console.error("[beacon] page tools did not register:", error);
    return { ok: false, reason: String(error?.message ?? error) };
  }
}
