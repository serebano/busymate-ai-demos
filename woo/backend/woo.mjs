// sites/woo/backend/woo.mjs
//
// The only thing in this demo that talks to WooCommerce.
//
// TWO surfaces, deliberately kept apart:
//
//   • the Store API (`/wp-json/wc/store/v1/…`) is PUBLIC. The catalogue, its
//     categories and stock are public facts on a shop that anybody can read by
//     opening the page, so the tools that answer them carry no credential at
//     all. A credential we do not need is a credential we cannot leak.
//
//   • the REST API (`/wp-json/wc/v3/…`) is KEYED, and only the order book needs
//     it. Every call through it is scoped to ONE customer id, and that id comes
//     from the platform's signed actor token — never from a tool argument.
//
// The key pair lives on the box in /srv/demos/woo/data/.wc-api-key (0600) and
// reaches this process as WC_CONSUMER_KEY / WC_CONSUMER_SECRET. It is never in
// this repo, never printed, and never returned to a caller.

const ORIGIN = process.env.WOO_ORIGIN ?? "https://woo.demo.busymate.ai";
/** Where the HTTP actually goes. Inside the compose network this is the
 *  container name, so the request never leaves the box and never needs TLS;
 *  WordPress still believes it is the https origin because of the two headers
 *  below (the same pair its wp-config trusts behind the edge proxy). */
const UPSTREAM = process.env.WOO_UPSTREAM ?? ORIGIN;
const HOST = new URL(ORIGIN).host;

const KEY = process.env.WC_CONSUMER_KEY ?? "";
const SECRET = process.env.WC_CONSUMER_SECRET ?? "";

/** Can this process answer a question about the order book at all? */
export const orderBookReady = Boolean(KEY && SECRET);

const baseHeaders = () => ({
  host: HOST,
  "x-forwarded-proto": "https",
  accept: "application/json",
  "user-agent": "fernweh-demo-mcp/1.0",
});

async function get(path, { authed = false } = {}) {
  const headers = baseHeaders();
  if (authed) {
    if (!orderBookReady) throw new Error("order_book_unconfigured");
    headers.authorization = `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`;
  }
  const res = await fetch(`${UPSTREAM}${path}`, { headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = null; }
  if (!res.ok) {
    const code = body?.code ?? `http_${res.status}`;
    throw new Error(`woocommerce_${code}`);
  }
  return body;
}

/** WordPress hands back entity-escaped titles; a chat answer wants the words. */
export function unescape(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}

const strip = (html) => unescape(String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

/** Store API prices are minor units ("14900") plus the unit count. */
function money(prices) {
  const minor = Number(prices?.price ?? 0);
  const dp = Number(prices?.currency_minor_unit ?? 2);
  const value = (minor / 10 ** dp).toFixed(dp);
  const symbol = prices?.currency_symbol ? unescape(prices.currency_symbol) : "";
  return { amount: value, currency: prices?.currency_code ?? "EUR", display: `${symbol}${value}` };
}

function productOut(p) {
  const price = money(p.prices);
  const regular = Number(p.prices?.regular_price ?? 0);
  const onSale = Number(p.prices?.sale_price ?? 0) < regular;
  return {
    sku: p.sku,
    name: unescape(p.name),
    categories: (p.categories ?? []).map((c) => unescape(c.name)),
    price: price.display,
    currency: price.currency,
    ...(onSale
      ? { wasPrice: `${unescape(p.prices?.currency_symbol ?? "")}${(regular / 10 ** Number(p.prices.currency_minor_unit ?? 2)).toFixed(2)}` }
      : {}),
    inStock: p.is_in_stock === true,
    ...(typeof p.low_stock_remaining === "number" ? { onlyLeft: p.low_stock_remaining } : {}),
    summary: strip(p.short_description),
    attributes: Object.fromEntries(
      (p.attributes ?? []).map((a) => [unescape(a.name), (a.terms ?? []).map((t) => unescape(t.name)).join(", ")]),
    ),
    url: p.permalink,
  };
}

/** Every published product, once, cached for a minute. */
let catalogueCache = { at: 0, rows: [] };
export async function catalogue() {
  if (Date.now() - catalogueCache.at < 60_000 && catalogueCache.rows.length) return catalogueCache.rows;
  const rows = await get("/wp-json/wc/store/v1/products?per_page=100&orderby=title&order=asc");
  catalogueCache = { at: Date.now(), rows: Array.isArray(rows) ? rows : [] };
  return catalogueCache.rows;
}

export async function searchProducts({ query = "", category = "", inStockOnly = false, maxPrice } = {}) {
  const rows = await catalogue();
  const needle = String(query).toLowerCase().trim();
  const cat = String(category).toLowerCase().trim();
  const matches = rows.filter((p) => {
    const hay = [p.name, p.sku, strip(p.short_description), strip(p.description),
      ...(p.categories ?? []).map((c) => c.name)].join(" ").toLowerCase();
    if (needle && !needle.split(/\s+/).every((word) => hay.includes(word))) return false;
    if (cat && !(p.categories ?? []).some((c) => unescape(c.name).toLowerCase().includes(cat) || c.slug === cat)) return false;
    if (inStockOnly && p.is_in_stock !== true) return false;
    if (typeof maxPrice === "number") {
      const dp = Number(p.prices?.currency_minor_unit ?? 2);
      if (Number(p.prices?.price ?? 0) / 10 ** dp > maxPrice) return false;
    }
    return true;
  });
  return { count: matches.length, products: matches.map(productOut) };
}

export async function productBySku(sku) {
  const rows = await catalogue();
  const want = String(sku ?? "").trim().toLowerCase();
  const hit = rows.find((p) => String(p.sku).toLowerCase() === want)
    ?? rows.find((p) => unescape(p.name).toLowerCase().includes(want));
  if (!hit) return { error: "not_found", detail: `Nothing in the range matches “${sku}”.` };
  return {
    ...productOut(hit),
    description: strip(hit.description),
  };
}

export async function categories() {
  const rows = await get("/wp-json/wc/store/v1/products/categories");
  return {
    categories: (Array.isArray(rows) ? rows : [])
      .filter((c) => c.count > 0)
      .map((c) => ({ name: unescape(c.name), slug: c.slug, products: c.count, description: strip(c.description), url: c.permalink })),
  };
}

// ── the order book ─────────────────────────────────────────────────────────
// Every function below takes `customerId` as its FIRST argument and passes it
// to WooCommerce as the `customer` filter. There is no code path that reads an
// order without one, so a caller who is not identified cannot reach one.

const ORDER_STATE = {
  pending: "waiting for payment",
  processing: "paid and being packed",
  "on-hold": "on hold — we are waiting on something before it ships",
  completed: "shipped and completed",
  cancelled: "cancelled",
  refunded: "refunded",
  failed: "payment failed",
};

function orderOut(o) {
  return {
    number: `#${o.number}`,
    status: o.status,
    statusMeans: ORDER_STATE[o.status] ?? o.status,
    placed: String(o.date_created ?? "").slice(0, 10),
    total: `${o.currency === "EUR" ? "€" : ""}${o.total}`,
    items: (o.line_items ?? []).map((l) => ({ name: unescape(l.name), sku: l.sku, quantity: l.quantity })),
    delivery: (o.shipping_lines ?? []).map((s) => unescape(s.method_title)).join(", ") || null,
    shipTo: [o.shipping?.city, o.shipping?.country].filter(Boolean).join(", ") || null,
    ...(o.status === "refunded" && Array.isArray(o.refunds) && o.refunds.length
      ? { refunded: `${o.currency === "EUR" ? "€" : ""}${String(o.refunds[0].total).replace(/^-/, "")}` }
      : {}),
    url: `${ORIGIN}/my-account/view-order/${o.id}/`,
  };
}

export async function ordersFor(customerId) {
  const rows = await get(`/wp-json/wc/v3/orders?customer=${encodeURIComponent(customerId)}&per_page=25&orderby=date&order=desc`, { authed: true });
  return Array.isArray(rows) ? rows : [];
}

export async function listOrders(customerId) {
  const rows = await ordersFor(customerId);
  return { count: rows.length, orders: rows.map(orderOut) };
}

export async function orderStatus(customerId, orderNumber) {
  const rows = await ordersFor(customerId);
  const want = String(orderNumber ?? "").replace(/[^0-9]/g, "");
  const hit = want ? rows.find((o) => String(o.number) === want) : rows[0];
  if (!hit) {
    return {
      error: "not_found",
      detail: want
        ? `There is no order ${orderNumber} on this account.`
        : "There are no orders on this account yet.",
    };
  }
  return { order: orderOut(hit) };
}

/**
 * Open a return. A demo shop takes no money, so this does not move any, and it
 * says so: it writes a customer-visible note on the real order and hands back
 * the reference that note creates. Nothing is invented — if the order or the
 * item is not on this customer's account the answer is a refusal.
 */
export async function startReturn(customerId, { orderNumber, item, reason } = {}) {
  const rows = await ordersFor(customerId);
  const want = String(orderNumber ?? "").replace(/[^0-9]/g, "");
  // Neither argument is required by the schema — that is what lets the action
  // card ask for them as FIELDS instead of the assistant asking in a paragraph
  // — so the completeness check lives here, where the write happens, and says
  // which one is missing rather than looking up order "undefined".
  if (!want) {
    return {
      error: "order_number_missing",
      detail: "Which order is it going back from? "
        + (rows.length ? `This account has ${rows.map((o) => `#${o.number}`).join(", ")}.` : "This account has no orders."),
    };
  }
  const order = rows.find((o) => String(o.number) === want);
  if (!order) return { error: "not_found", detail: `There is no order ${orderNumber} on this account.` };
  const wanted = String(item ?? "").toLowerCase().trim();
  if (!wanted) {
    return {
      error: "item_missing",
      detail: `Which item from order #${order.number} is going back? It has: `
        + (order.line_items ?? []).map((l) => unescape(l.name)).join(", ") + ".",
    };
  }
  const line = (order.line_items ?? []).find(
    (l) => String(l.sku).toLowerCase() === wanted || unescape(l.name).toLowerCase().includes(wanted),
  );
  if (!line) {
    return {
      error: "item_not_on_order",
      detail: `Order #${order.number} does not contain “${item}”. It has: `
        + (order.line_items ?? []).map((l) => unescape(l.name)).join(", ") + ".",
    };
  }
  if (!["completed", "processing"].includes(order.status)) {
    return {
      error: "not_returnable",
      detail: `Order #${order.number} is ${ORDER_STATE[order.status] ?? order.status}, so there is nothing to return yet.`,
    };
  }
  const reference = `RMA-${order.number}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const note = `Return requested through the assistant. Reference ${reference}. Item: `
    + `${unescape(line.name)} (${line.sku}). Reason: ${String(reason ?? "not given").slice(0, 400)}.`;
  await postJson(`/wp-json/wc/v3/orders/${order.id}/notes`, { note, customer_note: true });
  return {
    reference,
    order: `#${order.number}`,
    item: unescape(line.name),
    status: "open",
    detail: "The return is open and the note is on the order. This is a demonstration shop, "
      + "so no parcel is collected and no money moves — on a real store this is where the label would be issued.",
    next: "Keep the reference; it is on the order in the customer's account.",
  };
}

async function postJson(path, body) {
  if (!orderBookReady) throw new Error("order_book_unconfigured");
  const res = await fetch(`${UPSTREAM}${path}`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let code = `http_${res.status}`;
    try { code = JSON.parse(text).code ?? code; } catch { /* keep the status */ }
    throw new Error(`woocommerce_${code}`);
  }
  try { return JSON.parse(text); } catch { return null; }
}
