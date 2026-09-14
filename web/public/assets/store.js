/*
 * The storefront itself: catalog, cart and the demo customer's account.
 *
 * Every function here is also what a page tool calls, so the assistant and the
 * buttons do exactly the same thing to exactly the same state.
 */
import { productCard } from "/_shared/ui/cards.js";

const state = {
  products: [],
  cart: load("nw_cart", []),
  customer: null,
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save() {
  try { localStorage.setItem("nw_cart", JSON.stringify(state.cart)); } catch { /* private mode */ }
}
const money = (n) => `$${n}`;
const el = (id) => document.getElementById(id);

export function products() { return state.products; }
export function customer() { return state.customer; }

export async function loadCatalog() {
  const res = await fetch("/api/store/products");
  state.products = (await res.json()).products;
  renderCatalog();
  renderCart();
  return state.products;
}

export function findProducts(query = "", { decafOnly = false } = {}) {
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  return state.products.filter((p) => {
    if (decafOnly && !p.decaf) return false;
    if (terms.length === 0) return true;
    const hay = [p.name, p.origin, p.roast, p.notes, p.tags.join(" ")].join(" ").toLowerCase();
    return terms.some((t) => hay.includes(t));
  });
}

export function addToCart(sku, qty = 1) {
  const product = state.products.find(
    (p) => p.sku.toLowerCase() === String(sku).toLowerCase()
      || p.name.toLowerCase() === String(sku).toLowerCase(),
  );
  if (!product) return { ok: false, error: "no_such_coffee", sku };
  const n = Math.max(1, Math.min(12, Number(qty) || 1));
  const line = state.cart.find((l) => l.sku === product.sku);
  if (line) line.qty = Math.min(12, line.qty + n);
  else state.cart.push({ sku: product.sku, name: product.name, price: product.price, qty: n });
  save();
  renderCart();
  flash(`${product.name} added to the cart`);
  return { ok: true, added: { sku: product.sku, name: product.name, qty: n }, cart: cart() };
}

export function removeFromCart(sku) {
  const before = state.cart.length;
  state.cart = state.cart.filter((l) => l.sku.toLowerCase() !== String(sku).toLowerCase());
  save();
  renderCart();
  return { ok: state.cart.length < before, cart: cart() };
}

export function cart() {
  const lines = state.cart.map((l) => ({ ...l, lineTotal: l.price * l.qty }));
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const shipping = subtotal === 0 || subtotal >= 40 ? 0 : 5;
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeShippingIn: subtotal >= 40 ? 0 : 40 - subtotal,
  };
}

export async function signIn() {
  await fetch("/api/identity/login", { method: "POST", credentials: "same-origin" });
  await refreshAccount();
  if (window.BusymateAI?.refreshIdentity) await window.BusymateAI.refreshIdentity();
  flash(`Signed in as ${state.customer?.name ?? "the demo customer"}`);
}

export async function signOut() {
  await fetch("/api/identity/logout", { method: "POST", credentials: "same-origin" });
  await refreshAccount();
  if (window.BusymateAI?.refreshIdentity) await window.BusymateAI.refreshIdentity();
  flash("Signed out — the assistant is back to a plain visitor");
}

export async function refreshAccount() {
  const res = await fetch("/api/identity/session", { credentials: "same-origin" });
  const body = await res.json();
  state.customer = body.signedIn ? body.customer : null;
  if (state.customer) {
    const orders = await (await fetch("/api/store/orders", { credentials: "same-origin" })).json();
    state.orders = orders.orders ?? [];
  } else {
    state.orders = [];
  }
  renderAccount();
  return state.customer;
}

export function orders() { return state.orders ?? []; }

export async function orderStatus(number) {
  const res = await fetch(`/api/store/orders/${encodeURIComponent(String(number).replace(/^#/, ""))}`, {
    credentials: "same-origin",
  });
  if (res.status === 401) return { ok: false, error: "not_signed_in" };
  if (!res.ok) return { ok: false, error: "not_found" };
  return { ok: true, order: await res.json() };
}

export async function requestReturn(payload) {
  const res = await fetch("/api/store/returns", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ---- rendering -------------------------------------------------------------

function renderCatalog() {
  const grid = el("catalog");
  if (!grid) return;
  grid.innerHTML = state.products.map((p) => productCard(p)).join("");
  grid.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", () => addToCart(b.dataset.add)),
  );
}

function renderCart() {
  const c = cart();
  const count = el("cart-count");
  if (count) {
    count.textContent = String(c.itemCount);
    count.hidden = c.itemCount === 0;
  }
  // #2905/#2906 (agent-ready.dev A11, WCAG 2.5.3) — the button's accessible
  // name must contain its visible text ("Cart" + the count span), which
  // changes with every add/remove. Composing it here — the ONE place the
  // count itself is written — means the two can never drift apart.
  const cartBtn = el("cart-btn");
  if (cartBtn) {
    cartBtn.setAttribute("aria-label", `Cart ${c.itemCount} item${c.itemCount === 1 ? "" : "s"} — open the cart`);
  }
  const panel = el("cart-lines");
  if (!panel) return;
  panel.innerHTML = c.lines.length
    ? c.lines
        .map(
          (l) => `<li><span>${l.qty} × ${l.name}</span><span>${money(l.lineTotal)}`
            + `<button class="link" type="button" data-remove="${l.sku}" aria-label="Remove ${l.name}">remove</button></span></li>`,
        )
        .join("")
    : `<li class="empty">Nothing in the cart yet.</li>`;
  panel.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => removeFromCart(b.dataset.remove)),
  );
  const totals = el("cart-total");
  if (totals) {
    totals.textContent = c.itemCount
      ? `${money(c.subtotal)} + ${c.shipping ? `${money(c.shipping)} delivery` : "free delivery"} = ${money(c.total)}`
      : "";
  }
}

function renderAccount() {
  const signedIn = Boolean(state.customer);
  document.body.dataset.signedIn = signedIn ? "yes" : "no";
  const who = el("account-who");
  if (who) {
    who.textContent = signedIn
      ? `${state.customer.name} · customer since ${state.customer.since}`
      : "Nobody is signed in.";
  }
  const list = el("account-orders");
  if (list) {
    list.innerHTML = signedIn
      ? orders()
          .map(
            (o) => `<li><strong>${o.number}</strong> <span class="status status-${o.status.replace(/\s+/g, "-")}">${o.status}</span>
              <span class="muted">${o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")} · ${money(o.total)}</span></li>`,
          )
          .join("")
      : `<li class="empty">Sign in as the demo customer to see orders here — and to watch the assistant get the same access.</li>`;
  }
  const sub = el("account-sub");
  if (sub) {
    sub.textContent = signedIn
      ? `${state.customer.subscription.plan} · ${state.customer.subscription.beans} · next roast ${state.customer.subscription.nextShipment}`
      : "";
  }
}

let flashTimer = null;
export function flash(message) {
  const bar = el("flash");
  if (!bar) return;
  bar.textContent = message;
  bar.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { bar.hidden = true; }, 3200);
}
