/*
 * What this page can do, published as tools.
 *
 * The descriptors live in page-tools.data.js; this file gives each one the
 * function that runs it. Every `execute` runs here, in the visitor's own
 * browser session, through the WooCommerce Store API — the same endpoints the
 * theme's own add-to-cart buttons post to — so a tool can never do something
 * the visitor could not do by clicking. Reads carry readOnlyHint; the three
 * that change something do not, so the host confirms them.
 */
import { TOOL_SPECS } from "./page-tools.data.js";

const STORE = "/wp-json/wc/store/v1";

/** The Store API's own CSRF nonce, handed back on every response. */
let nonce = null;

async function store(path, { method = "GET", body } = {}) {
  const headers = { accept: "application/json" };
  if (body) headers["content-type"] = "application/json";
  if (nonce) headers.nonce = nonce;
  const res = await fetch(STORE + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const fresh = res.headers.get("nonce");
  if (fresh) nonce = fresh;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* an empty or non-JSON body is handled below */ }
  if (!res.ok) {
    const error = new Error(json?.message || `store_api_${res.status}`);
    error.code = json?.code ?? `http_${res.status}`;
    throw error;
  }
  return json;
}

const plain = (html) => {
  const box = document.createElement("div");
  box.innerHTML = String(html ?? "");
  return (box.textContent || "").replace(/\s+/g, " ").trim();
};

const priceOf = (prices) => {
  const dp = Number(prices?.currency_minor_unit ?? 2);
  const symbol = plain(prices?.currency_symbol ?? "");
  return `${symbol}${(Number(prices?.price ?? 0) / 10 ** dp).toFixed(dp)}`;
};

let catalogue = null;
async function products() {
  if (!catalogue) catalogue = await store("/products?per_page=100");
  return catalogue;
}

/** Find one product by SKU first, then by a name that contains the words. */
async function findOne(needle) {
  const want = String(needle ?? "").trim().toLowerCase();
  const rows = await products();
  return rows.find((p) => String(p.sku).toLowerCase() === want)
    ?? rows.find((p) => plain(p.name).toLowerCase().includes(want))
    ?? null;
}

const cartOut = (cart) => ({
  items: (cart.items ?? []).map((i) => ({
    name: plain(i.name),
    sku: i.sku,
    quantity: i.quantity,
    line: priceOf({ ...i.totals, price: i.totals?.line_total, currency_symbol: i.totals?.currency_symbol }),
  })),
  itemCount: cart.items_count ?? 0,
  total: priceOf({ ...cart.totals, price: cart.totals?.total_price, currency_symbol: cart.totals?.currency_symbol }),
  delivery: (cart.shipping_rates?.[0]?.shipping_rates ?? []).filter((r) => r.selected).map((r) => plain(r.name))[0] ?? null,
  cartUrl: new URL("/cart/", location.origin).href,
});

const EXECUTE = {
  search_the_shop: async ({ query = "", inStockOnly = false }) => {
    const needle = String(query).toLowerCase().trim();
    const rows = (await products()).filter((p) => {
      if (inStockOnly && p.is_in_stock !== true) return false;
      if (!needle) return true;
      const hay = [p.name, p.sku, p.short_description, p.description,
        ...(p.categories ?? []).map((c) => c.name)].map(plain).join(" ").toLowerCase();
      return needle.split(/\s+/).every((word) => hay.includes(word));
    });
    return {
      count: rows.length,
      products: rows.map((p) => ({
        sku: p.sku,
        name: plain(p.name),
        price: priceOf(p.prices),
        inStock: p.is_in_stock === true,
        summary: plain(p.short_description),
        url: p.permalink,
      })),
    };
  },

  view_cart: async () => cartOut(await store("/cart")),

  add_to_cart: async ({ sku, quantity }) => {
    const product = await findOne(sku);
    if (!product) return { error: "not_found", detail: `Nothing in the range matches “${sku}”.` };
    if (product.is_in_stock !== true) {
      return { error: "out_of_stock", detail: `${plain(product.name)} is out of stock, so it cannot go in the cart.` };
    }
    await store("/cart"); // pick up the nonce before the write
    const cart = await store("/cart/add-item", {
      method: "POST",
      body: { id: product.id, quantity: Math.min(Math.max(Number(quantity) || 1, 1), 10) },
    });
    document.body.dispatchEvent(new Event("wc_fragment_refresh"));
    return { added: plain(product.name), ...cartOut(cart) };
  },

  remove_from_cart: async ({ sku }) => {
    const cart = await store("/cart");
    const want = String(sku ?? "").trim().toLowerCase();
    const line = (cart.items ?? []).find(
      (i) => String(i.sku).toLowerCase() === want || plain(i.name).toLowerCase().includes(want),
    );
    if (!line) return { error: "not_in_cart", detail: `There is no “${sku}” in the cart.` };
    const after = await store("/cart/remove-item", { method: "POST", body: { key: line.key } });
    document.body.dispatchEvent(new Event("wc_fragment_refresh"));
    return { removed: plain(line.name), ...cartOut(after) };
  },

  open_product: async ({ sku }) => {
    const product = await findOne(sku);
    if (!product) return { error: "not_found", detail: `Nothing in the range matches “${sku}”.` };
    location.assign(product.permalink);
    return { opened: plain(product.name), url: product.permalink };
  },

  who_is_signed_in: async () => {
    const el = document.documentElement;
    const name = el.getAttribute("data-fernweh-customer") || "";
    return name
      ? { signedIn: true, name, accountUrl: new URL("/my-account/", location.origin).href }
      : {
        signedIn: false,
        detail: "Nobody is signed in to the store in this browser. Most questions do not need it; "
          + "an order or a return does, and the chat offers a one-click sign-in card of its own.",
      };
  },
};

export const TOOLS = TOOL_SPECS.map((spec) => ({ ...spec, execute: EXECUTE[spec.name] }));

/** The embed script loads deferred, so the API may not exist yet. */
async function waitForSdk(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (typeof window.BusymateAI?.registerPageTools === "function") return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

/**
 * Register, and SAY SO. registerPageTools validates every property of every
 * inputSchema — one missing `description` rejects the whole call — and an
 * un-awaited promise turns that into zero tools with no visible error.
 */
export async function register() {
  if (!(await waitForSdk())) return { ok: false, reason: "sdk_absent" };
  try {
    await window.BusymateAI.registerPageTools(TOOLS);
    const live = globalThis.document?.modelContext?.getTools?.() ?? null;
    const result = { ok: true, registered: TOOLS.map((t) => t.name), nativeToolCount: live ? live.length : null };
    window.__fernwehPageTools = result;
    return result;
  } catch (error) {
    console.error("[fernweh] page tools did not register:", error);
    window.__fernwehPageTools = { ok: false, reason: String(error?.message ?? error) };
    return window.__fernwehPageTools;
  }
}

register();
