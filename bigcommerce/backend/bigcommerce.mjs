// sites/bigcommerce/backend/bigcommerce.mjs
//
// The only thing in this demo that talks to BigCommerce.
//
// BigCommerce is a hosted SaaS (like Shopify) — there is no self-hosted
// plugin to own identity, so this backend is self-hosted end to end (same
// shape as sites/shopify/backend): it reads the store's LIVE catalogue and
// order book straight from the Admin API v2/v3 with a store-level API
// account token, and the shared mcp-identity-server.mjs provides identity
// for a fixed, documented demo customer (never a real person) — the same
// pattern every non-self-hostable demo in this repo uses.
//
// Credentials come from the container's own env (STORE_HASH / ACCESS_TOKEN /
// CLIENT_ID), injected at `docker run` time from a 0600 file on the box
// (<demo-host>/bigcommerce/data/.bc-api-key) — never committed, never printed.

const STORE_HASH = process.env.BC_STORE_HASH ?? "";
const ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN ?? "";
const CLIENT_ID = process.env.BC_CLIENT_ID ?? "";
const API_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}`;

/** Can this process answer anything about the store at all? */
export const apiReady = Boolean(STORE_HASH && ACCESS_TOKEN && CLIENT_ID);

const headers = () => ({
  "x-auth-token": ACCESS_TOKEN,
  "x-auth-client": CLIENT_ID,
  accept: "application/json",
  "content-type": "application/json",
});

async function get(path) {
  if (!apiReady) throw new Error("bigcommerce_unconfigured");
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = null; }
  if (!res.ok) {
    const code = body?.title ?? `http_${res.status}`;
    throw new Error(`bigcommerce_${code}`);
  }
  return body;
}

function money(amount) {
  const n = Number(amount ?? 0);
  return { amount: n.toFixed(2), display: `$${n.toFixed(2)}` };
}

function productOut(p) {
  const price = money(p.price);
  const onSale = Number(p.sale_price ?? 0) > 0 && Number(p.sale_price) < Number(p.price);
  return {
    sku: p.sku,
    name: p.name,
    price: onSale ? money(p.sale_price).display : price.display,
    ...(onSale ? { wasPrice: price.display } : {}),
    inStock: (p.inventory_level ?? 0) > 0 || p.inventory_tracking === "none",
    ...(p.inventory_tracking === "product" ? { stockRemaining: p.inventory_level } : {}),
    weightKg: p.weight,
    summary: String(p.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    url: p.custom_url?.url ?? null,
    categories: p.categories ?? [],
  };
}

/** Every product, once, cached for a minute. */
let catalogueCache = { at: 0, rows: [] };
export async function catalogue() {
  if (Date.now() - catalogueCache.at < 60_000 && catalogueCache.rows.length) return catalogueCache.rows;
  const body = await get("/v3/catalog/products?limit=250&include=images");
  catalogueCache = { at: Date.now(), rows: Array.isArray(body?.data) ? body.data : [] };
  return catalogueCache.rows;
}

let categoryCache = { at: 0, rows: [] };
export async function categoryMap() {
  if (Date.now() - categoryCache.at < 300_000 && categoryCache.rows.length) return categoryCache.rows;
  const body = await get("/v3/catalog/categories?limit=250");
  categoryCache = { at: Date.now(), rows: Array.isArray(body?.data) ? body.data : [] };
  return categoryCache.rows;
}

export async function searchProducts({ query = "", category = "", inStockOnly = false, maxPrice } = {}) {
  const rows = await catalogue();
  const cats = await categoryMap();
  const needle = String(query).toLowerCase().trim();
  const catNeedle = String(category).toLowerCase().trim();
  const matches = rows.filter((p) => {
    const hay = [p.name, p.sku, p.description].join(" ").toLowerCase();
    if (needle && !needle.split(/\s+/).every((word) => hay.includes(word))) return false;
    if (catNeedle) {
      const names = (p.categories ?? []).map((id) => cats.find((c) => c.id === id)?.name?.toLowerCase() ?? "");
      if (!names.some((n) => n.includes(catNeedle))) return false;
    }
    if (inStockOnly && !((p.inventory_level ?? 0) > 0 || p.inventory_tracking === "none")) return false;
    if (typeof maxPrice === "number" && Number(p.price) > maxPrice) return false;
    return true;
  });
  return { count: matches.length, products: matches.map(productOut) };
}

export async function productBySku(sku) {
  const rows = await catalogue();
  const want = String(sku ?? "").trim().toLowerCase();
  const hit = rows.find((p) => String(p.sku).toLowerCase() === want)
    ?? rows.find((p) => String(p.name).toLowerCase().includes(want));
  if (!hit) return { error: "not_found", detail: `Nothing in the range matches "${sku}".` };
  return productOut(hit);
}

export async function categories() {
  const rows = await categoryMap();
  return { categories: rows.filter((c) => c.parent_id === 0).map((c) => ({ name: c.name, slug: c.custom_url?.url ?? null })) };
}

// ── the order book ─────────────────────────────────────────────────────────
// Orders carry no BigCommerce customer_id in this demo (created as guest
// checkouts via the seeding script), so every read is scoped by the signed-in
// demo customer's EMAIL — never by a tool argument — exactly the same
// never-reads-without-an-identified-caller shape sites/woo/backend/woo.mjs
// uses for its `customer` filter.

const ORDER_STATE = {
  "Awaiting Fulfillment": "paid and being packed",
  Shipped: "shipped",
  "Partially Shipped": "partially shipped",
  Completed: "delivered and completed",
  Cancelled: "cancelled",
  Refunded: "refunded",
  "Awaiting Payment": "waiting for payment",
};

function orderOut(o, lineItems) {
  const placedDate = new Date(o.date_created);
  return {
    number: `#${o.id}`,
    status: o.status,
    statusMeans: ORDER_STATE[o.status] ?? o.status,
    placed: Number.isNaN(placedDate.getTime()) ? String(o.date_created ?? "") : placedDate.toISOString().slice(0, 10),
    total: `$${Number(o.total_inc_tax ?? 0).toFixed(2)}`,
    items: lineItems.map((l) => ({ name: l.name, sku: l.sku, quantity: l.quantity })),
    shipTo: [o.billing_address?.city, o.billing_address?.country].filter(Boolean).join(", ") || null,
  };
}

async function ordersForEmail(email) {
  if (!email) return [];
  const body = await get("/v2/orders?limit=250&sort=date_created:desc");
  const rows = Array.isArray(body) ? body : [];
  return rows.filter((o) => String(o.billing_address?.email ?? "").toLowerCase() === String(email).toLowerCase());
}

export async function listOrders(email) {
  const rows = await ordersForEmail(email);
  const withItems = await Promise.all(rows.map(async (o) => {
    const items = await get(`/v2/orders/${o.id}/products`);
    return orderOut(o, Array.isArray(items) ? items : []);
  }));
  return { count: withItems.length, orders: withItems };
}

export async function orderStatus(email, orderNumber) {
  const rows = await ordersForEmail(email);
  const want = String(orderNumber ?? "").replace(/[^0-9]/g, "");
  const hit = want ? rows.find((o) => String(o.id) === want) : rows[0];
  if (!hit) {
    return {
      error: "not_found",
      detail: want ? `There is no order ${orderNumber} on this account.` : "There are no orders on this account yet.",
    };
  }
  const items = await get(`/v2/orders/${hit.id}/products`);
  return { order: orderOut(hit, Array.isArray(items) ? items : []) };
}
