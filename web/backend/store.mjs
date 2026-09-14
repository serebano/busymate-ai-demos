// Northwind Coffee demo store — the data layer.
// Read-only catalog + policies from data/store.json; returns are kept in memory
// (a demo: they reset when the container restarts, and nothing here is real).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(HERE, "data", "store.json"), "utf8"));

/** Returns raised during this container's life. Demo-only, never persisted. */
const returns = [];
let returnSeq = 4100;

export const store = DATA.store;
export const products = DATA.products;
export const policies = DATA.policies;
export const demoCustomer = DATA.customer;

const norm = (s) => String(s ?? "").toLowerCase().trim();

export function searchProducts(query = "", { decaf = null, max = 6 } = {}) {
  const q = norm(query);
  const terms = q ? q.split(/\s+/).filter(Boolean) : [];
  const scored = products
    .filter((p) => (decaf === null ? true : p.decaf === decaf))
    .map((p) => {
      const hay = norm([p.name, p.origin, p.roast, p.notes, p.tags.join(" ")].join(" "));
      const score = terms.length === 0 ? 1 : terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
    .slice(0, max)
    .map((r) => r.p);
  return scored;
}

export function getProduct(sku) {
  const k = norm(sku);
  return products.find((p) => norm(p.sku) === k || norm(p.name) === k) ?? null;
}

export function getPolicy(name) {
  const k = norm(name);
  return Object.prototype.hasOwnProperty.call(policies, k) ? policies[k] : null;
}

export function policyNames() {
  return Object.keys(policies);
}

export function ordersFor(customerId) {
  if (!customerId || customerId !== demoCustomer.id) return [];
  return DATA.orders.map((o) => ({ ...o, returns: returns.filter((r) => r.orderNumber === o.number) }));
}

export function orderFor(customerId, number) {
  const k = norm(number).replace(/^#/, "");
  return ordersFor(customerId).find((o) => norm(o.number) === k) ?? null;
}

export function startReturn(customerId, { orderNumber, sku, reason }) {
  const order = orderFor(customerId, orderNumber);
  // Every `detail` here is visitor-facing: plain language, no machinery.
  if (!order) {
    return { ok: false, error: "order_not_found", detail: "I cannot find an order with that number on this account." };
  }
  if (!order.returnable) {
    return {
      ok: false,
      error: "not_returnable",
      detail: order.returnableNote
        ? `That order is ${order.returnableNote.toLowerCase().replace(/\.$/, "")}, so it can no longer be returned.`
        : "That order is outside the return window.",
    };
  }
  const line = order.items.find((i) => norm(i.sku) === norm(sku) || norm(i.name) === norm(sku));
  if (!line) {
    return {
      ok: false,
      error: "item_not_in_order",
      detail: "That item is not on this order.",
      items: order.items.map((i) => i.name),
    };
  }
  const existing = returns.find((r) => r.orderNumber === order.number && r.sku === line.sku);
  if (existing) return { ok: true, alreadyOpen: true, ...existing };
  const record = {
    id: `RMA-${++returnSeq}`,
    orderNumber: order.number,
    sku: line.sku,
    item: line.name,
    reason: String(reason ?? "").slice(0, 300) || "Not specified",
    status: "approved",
    refund: line.price * line.qty,
    openedAt: new Date().toISOString().slice(0, 10),
    instructions:
      "Keep the bag — an unopened return under 30 days is refunded without a shipment back. "
      + "The refund lands on the original payment method in 3-5 business days.",
  };
  returns.push(record);
  return { ok: true, alreadyOpen: false, ...record };
}

/** Messages left through the chat's contact card. Demo-only, never persisted. */
const messages = [];
let messageSeq = 700;

// A model filling this tool's required `email` with something that satisfies the
// schema but was never typed by the visitor (a placeholder, or an invented one) is
// not a delivery detail — it is a fabricated argument, and the server is the one
// place that can actually stop it landing as a "sent" message. Local-part markers
// catch the generic ones the model reaches for; domain markers catch the reserved/
// example domains no real visitor's mail lives on.
const PLACEHOLDER_EMAIL_LOCAL_RE = /^(test|noreply|no-reply|donotreply|do-not-reply|user|customer|someone|anonymous|placeholder|foo|bar|name|firstname|lastname|email|yourname|guest|demo|sample)$/i;
const PLACEHOLDER_EMAIL_DOMAIN_RE = /^(example|test|sample|placeholder|domain|yourdomain|mydomain|company|acme)\.(com|org|net|test|invalid|example)$|\.(test|invalid|example)$|^mailinator\.com$/i;

function looksLikePlaceholderEmail(email) {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const local = email.slice(0, at).trim();
  const domain = email.slice(at + 1).trim();
  return PLACEHOLDER_EMAIL_LOCAL_RE.test(local) || PLACEHOLDER_EMAIL_DOMAIN_RE.test(domain);
}

export function leaveMessage({ name, email, message, orderNumber }) {
  const clean = (value, max) => String(value ?? "").trim().slice(0, max);
  const record = {
    reference: `NW-MSG-${++messageSeq}`,
    name: clean(name, 80),
    email: clean(email, 120),
    message: clean(message, 1500),
    orderNumber: clean(orderNumber, 40) || null,
    receivedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
  if (!record.name || !record.email || !record.message) {
    return { ok: false, error: "missing_details", detail: "I need a name, an email address and a message." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(record.email)) {
    return { ok: false, error: "bad_email", detail: "That email address does not look right." };
  }
  if (looksLikePlaceholderEmail(record.email)) {
    // `error`/`reason` are for the assistant and the logs — the same refusal shape
    // as the not_signed_in card (see mcp-identity-server.mjs): this tool always
    // carries a formCard, so this refusal re-shows it for the visitor to type
    // their OWN address into, instead of a message going out under a fake one.
    return {
      ok: false,
      error: "needs_input",
      reason: "placeholder_email",
      detail: "That looks like a placeholder rather than your own email — enter the address you'd like Northwind to reply to.",
    };
  }
  messages.push(record);
  return {
    ok: true,
    reference: record.reference,
    receivedAt: record.receivedAt,
    detail: "Thanks — a real shop would reply to this within one working day. "
      + "Northwind is a demonstration store, so nothing was actually sent.",
  };
}

export function messagesLeft() { return messages.slice(); }

/** The storefront's non-catalogue copy: reviews and the questions people ask. */
export function extras() {
  return { testimonials: DATA.testimonials ?? [], faq: DATA.faq ?? [], story: DATA.store.story };
}

export function returnsFor(customerId) {
  return customerId === demoCustomer.id ? returns.slice() : [];
}
