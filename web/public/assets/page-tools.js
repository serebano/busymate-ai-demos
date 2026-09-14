/*
 * What this page can do, published as tools.
 *
 * The descriptors live in page-tools.data.js; this file gives each one the
 * function that runs it. Every `execute` runs here, in the visitor's own
 * session, through the same code the buttons call — so a tool can never do
 * something a visitor could not. Reads carry readOnlyHint; the two that change
 * something are confirmed in the chat before they run.
 */
import { addToCart, cart, findProducts, orderStatus, requestReturn, customer } from "./store.js";
import { TOOL_SPECS } from "./page-tools.data.js";

// `error` is for the assistant and the logs. `detail` is the one string a
// visitor may read, so it says what to do in plain words and names no machinery.
const signInFirst = {
  error: "not_signed_in",
  // Names no control and no button label: the platform renders the sign-in card
  // from this refusal, and a detail that described a control is what taught the
  // assistant to write "press Sign in at the top of the page" instead (#2812).
  detail: "This one needs you signed in — the card just below will do it.",
};

const EXECUTE = {
  search_coffee: async ({ query, decafOnly }) => ({
    matches: findProducts(query ?? "", { decafOnly: decafOnly === true }).map((p) => ({
      sku: p.sku, name: p.name, roast: p.roast, notes: p.notes, price: p.price, size: p.size, inStock: p.stock > 0,
    })),
  }),
  add_to_cart: async ({ sku, qty }) => addToCart(sku, qty ?? 1),
  view_cart: async () => cart(),
  get_order_status: async ({ orderNumber }) => {
    if (!customer()) return signInFirst;
    const result = await orderStatus(orderNumber);
    return result.ok ? result.order : result;
  },
  start_return: async (args) => (customer() ? requestReturn(args) : signInFirst),
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
    console.error("[northwind] page tools did not register:", error);
    return { ok: false, reason: String(error?.message ?? error) };
  }
}
