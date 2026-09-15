// Northline Outdoor storefront — renders the catalog (window.NORTHLINE, built
// from backend/catalog.mjs), runs the cart drawer + quick view, defines the
// identity hook the embed script captures at load, and exposes window.Northline
// for the WebMCP page tools (assets/page-tools.js) to act through. Loaded SYNCHRONOUSLY before the
// embed <script> so BusymateAI.getIdentity exists when the widget boots.
(function () {
  "use strict";
  var N = window.NORTHLINE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0 }); };
  var bySku = {};
  N.products.forEach(function (p) { bySku[p.sku] = p; });
  var catName = function (slug) { var c = N.categories.filter(function (c) { return c.slug === slug; })[0]; return c ? c.name : slug; };
  var STOCK_WORDS = { in_stock: "In stock", low: "Low stock", backorder: "Backorder", sold_out: "Sold out" };
  var PALETTE = ["#1f4d2e", "#5e8c1f", "#d9773a", "#3b6ea5", "#8c5a2b", "#6b4c9a"];
  var avatarStyle = function (seed) { var h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0; var a = PALETTE[h % PALETTE.length], b = PALETTE[(h + 2) % PALETTE.length]; return "background:linear-gradient(135deg," + a + "," + b + ")"; };

  // ── product helpers
  function variants(p) {
    var colors = p.options.colors || [], sizes = p.options.sizes || [];
    if (colors.length && sizes.length) { var out = []; colors.forEach(function (c) { sizes.forEach(function (s) { out.push(c + " / " + s); }); }); return out; }
    if (colors.length) return colors.slice();
    if (sizes.length) return sizes.slice();
    return ["default"];
  }
  function stockOf(p, v) { return p.stock[v] || p.stock["default"] || "in_stock"; }
  function overallStock(p) {
    var s = Object.keys(p.stock).map(function (k) { return p.stock[k]; });
    if (s.every(function (x) { return x === "sold_out"; })) return "sold_out";
    if (s.every(function (x) { return x === "sold_out" || x === "backorder"; })) return "backorder";
    if (s.some(function (x) { return x !== "in_stock"; })) return "low";
    return "in_stock";
  }
  function stockLabel(p) {
    var o = overallStock(p);
    if (o === "in_stock") return "In stock";
    if (o === "sold_out") return "Sold out";
    if (o === "backorder") return "Backorder · ships in " + (p.backorderShips || "a few weeks");
    var n = Object.keys(p.stock).filter(function (k) { return p.stock[k] !== "in_stock"; }).length;
    return "Most variants in stock · " + n + " limited";
  }
  function firstAvailable(p) {
    var vs = variants(p);
    return vs.filter(function (v) { var s = stockOf(p, v); return s === "in_stock" || s === "low"; })[0] || vs.filter(function (v) { return stockOf(p, v) === "backorder"; })[0] || vs[0];
  }
  function img(p, w) { return "/img/products/" + p.image + "-" + (w || 480) + ".webp"; }
  function srcset(p) { return img(p, 480) + " 480w, " + img(p, 960) + " 960w, " + img(p, 1400) + " 1400w"; }

  function cardHtml(p, lazy) {
    var o = overallStock(p);
    var tag = p.badge ? '<span class="tag ' + esc(p.badge) + '">' + esc(p.badge) + "</span>" : "";
    var sale = p.compareAt ? '<span class="tag sale">Sale</span>' : "";
    return '<article class="card" id="p-' + esc(p.sku) + '" data-sku="' + esc(p.sku) + '" data-cat="' + esc(p.category) + '">' +
      '<div class="ph" data-qv="' + esc(p.sku) + '" role="button" tabindex="0" aria-label="Quick view ' + esc(p.title) + '">' +
      '<img src="' + img(p) + '" srcset="' + srcset(p) + '" sizes="(max-width:600px) 50vw, (max-width:1080px) 33vw, 280px" alt="' + esc(p.title) + '" width="480" height="600"' + (lazy ? ' loading="lazy" decoding="async"' : "") + ">" + tag + sale + "</div>" +
      '<div class="body"><span class="cat-lbl">' + esc(catName(p.category)) + "</span><h3>" + esc(p.title) + '</h3><p class="short">' + esc(p.short) + "</p>" +
      '<span class="stock ' + o + '"><i></i>' + esc(stockLabel(p)) + "</span>" +
      '<div class="row"><span class="price">' + money(p.price) + (p.compareAt ? "<s>" + money(p.compareAt) + "</s>" : "") + "</span>" +
      '<div class="actions"><button class="btn ghost small" data-qv="' + esc(p.sku) + '">Details</button><button class="btn small" data-add="' + esc(p.sku) + '"' + (o === "sold_out" ? " disabled" : "") + ">Add</button></div></div></div></article>";
  }

  // ── render
  function renderAll() {
    $("#featured").innerHTML = N.products.filter(function (p) { return p.badge === "featured" || p.badge === "new"; }).map(function (p) { return cardHtml(p, false); }).join("");
    $("#catalog").innerHTML = N.products.map(function (p) { return cardHtml(p, true); }).join("");
    $("#cats").innerHTML = N.categories.map(function (c) {
      return '<a class="cat" href="#shop" data-filter="' + esc(c.slug) + '"><img src="/img/scenes/' + esc(c.image) + '-600.webp" srcset="/img/scenes/' + esc(c.image) + '-600.webp 600w, /img/scenes/' + esc(c.image) + '-1000.webp 1000w" sizes="(max-width:600px) 50vw, 200px" alt="" loading="lazy" decoding="async" width="600" height="750"><div><b>' + esc(c.name) + "</b><span>" + esc(c.blurb) + "</span></div></a>";
    }).join("");
    $("#filters").innerHTML = '<button class="chip" aria-pressed="true" data-filter="all">All gear</button>' + N.categories.map(function (c) { return '<button class="chip" aria-pressed="false" data-filter="' + esc(c.slug) + '">' + esc(c.name) + "</button>"; }).join("") + '<span class="count" id="catCount">' + N.products.length + " products</span>";
    $("#reviewsGrid").innerHTML = N.reviews.map(function (r) {
      var p = bySku[r.product];
      return '<article class="review"><div class="stars" aria-label="' + r.rating + ' out of 5">' + "★★★★★".slice(0, r.rating) + '<span style="opacity:.25">' + "★★★★★".slice(r.rating) + "</span></div><p>“" + esc(r.text) + '”</p><div class="who"><span class="avatar" style="' + avatarStyle(r.name) + '" aria-hidden="true">' + esc(r.name.split(" ").map(function (w) { return w[0]; }).join("").replace(".", "")) + "</span><div><b>" + esc(r.name) + "</b><span>" + esc(r.where) + "</span>" + (p ? '<a href="#p-' + esc(p.sku) + '">' + esc(p.title) + "</a>" : "") + "</div></div></article>";
    }).join("");
    $("#teamGrid").innerHTML = N.team.map(function (m) { return '<div class="member"><span class="avatar" style="' + avatarStyle(m.name) + '" aria-hidden="true">' + esc(m.initials) + "</span><b>" + esc(m.name) + "</b><span>" + esc(m.role) + "</span><p>" + esc(m.note) + "</p></div>"; }).join("");
    $("#faq").innerHTML = N.faq.map(function (f) { return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>"; }).join("");
    $("#shipList").innerHTML = N.policies.shipping.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("");
    $("#retList").innerHTML = N.policies.returns.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("");
    $("#storyStats").innerHTML = N.story.stats.map(function (s) { return "<div><b>" + esc(s.value) + "</b><span>" + esc(s.label) + "</span></div>"; }).join("");
  }

  function applyFilter(slug) {
    $$("#filters .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === slug)); });
    var n = 0;
    $$("#catalog .card").forEach(function (c) { var show = slug === "all" || c.dataset.cat === slug; c.hidden = !show; if (show) n++; });
    $("#catCount").textContent = n + (n === 1 ? " product" : " products") + (slug === "all" ? "" : " in " + catName(slug));
  }

  // ── cart (client-side, this visitor's own browser)
  var CART_KEY = "northline_demo_cart";
  // Only lines whose SKU is in the catalog survive a read: a cart persisted by an
  // older page (or a tool call with a made-up SKU) must never break rendering.
  function getCart() { try { var raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return (Array.isArray(raw) ? raw : []).filter(function (i) { return i && bySku[i.sku] && i.qty > 0; }); } catch (e) { return []; } }
  function setCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); renderCart(); }
  function cartLines() {
    return getCart().map(function (i) { var p = bySku[i.sku]; return { sku: i.sku, variant: i.variant, qty: i.qty, title: p ? p.title : i.sku, unitPrice: p ? p.price : 0, lineTotal: p ? p.price * i.qty : 0 }; });
  }
  function cartSummary() {
    var lines = cartLines(); var sub = lines.reduce(function (n, l) { return n + l.lineTotal; }, 0);
    var ship = sub === 0 ? 0 : sub >= 75 ? 0 : 6.95;
    return { items: lines, itemCount: lines.reduce(function (n, l) { return n + l.qty; }, 0), subtotal: sub, shipping: ship, total: sub + ship, currency: "USD", freeShippingGap: sub >= 75 || sub === 0 ? 0 : Math.round((75 - sub) * 100) / 100 };
  }
  function addToCart(sku, qty, variant, opts) {
    var p = bySku[String(sku || "").toUpperCase()];
    if (!p) { var hit = N.products.filter(function (x) { return x.title.toLowerCase().indexOf(String(sku).toLowerCase()) !== -1; })[0]; if (!hit) return { ok: false, error: "unknown_sku", hint: "Use a SKU from the catalog, e.g. " + N.products.slice(0, 3).map(function (x) { return x.sku; }).join(", ") }; p = hit; }
    var vs = variants(p);
    var v = variant && vs.filter(function (x) { return x.toLowerCase() === String(variant).toLowerCase(); })[0];
    if (variant && !v) v = vs.filter(function (x) { return x.toLowerCase().indexOf(String(variant).toLowerCase()) !== -1; })[0];
    if (!v) v = firstAvailable(p);
    var st = stockOf(p, v);
    if (st === "sold_out") return { ok: false, error: "sold_out", sku: p.sku, variant: v, alternatives: vs.filter(function (x) { return stockOf(p, x) !== "sold_out"; }) };
    qty = Math.max(1, Math.min(10, Number(qty) || 1));
    var cart = getCart();
    var line = cart.filter(function (i) { return i.sku === p.sku && i.variant === v; })[0];
    if (line) line.qty += qty; else cart.push({ sku: p.sku, variant: v, qty: qty });
    setCart(cart);
    bumpBadge();
    toast("Added " + p.title + (v !== "default" ? " (" + v + ")" : "") + " to your cart");
    if (opts && opts.open) openDrawer();
    return { ok: true, added: { sku: p.sku, title: p.title, variant: v, qty: qty, stock: st, backorderShips: st === "backorder" ? p.backorderShips : undefined }, cart: cartSummary() };
  }
  function renderCart() {
    var s = cartSummary();
    var badge = $("#cartBadge"); badge.textContent = s.itemCount; badge.dataset.n = s.itemCount;
    // #2905/#2906 (agent-ready.dev A11, WCAG 2.5.3) — the button's accessible
    // name must contain its visible text ("Cart" + the badge), which changes
    // with every add/remove. Composing it here — the ONE place the badge
    // itself is written — means the two can never drift apart.
    var cartBtn = $(".cart-btn");
    if (cartBtn) cartBtn.setAttribute("aria-label", "Cart, " + s.itemCount + " item" + (s.itemCount === 1 ? "" : "s") + " — open cart");
    var box = $("#cartItems");
    if (!s.items.length) { box.innerHTML = '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6.3"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>Your cart is empty.<br><small>Try asking the assistant to add something.</small></div>'; }
    else box.innerHTML = s.items.map(function (l, idx) {
      var p = bySku[l.sku];
      return '<div class="line"><img src="' + img(p) + '" alt=""><div><b>' + esc(l.title) + "</b><span>" + (l.variant !== "default" ? esc(l.variant) + " · " : "") + money(l.unitPrice) + '</span><div class="qty"><button data-q="-1" data-i="' + idx + '" aria-label="Decrease">−</button><span>' + l.qty + '</span><button data-q="1" data-i="' + idx + '" aria-label="Increase">+</button></div><button class="rm" data-rm="' + idx + '">Remove</button></div><b>' + money(l.lineTotal) + "</b></div>";
    }).join("");
    $("#cartSub").textContent = money(s.subtotal);
    $("#cartShip").textContent = s.subtotal === 0 ? "—" : s.shipping === 0 ? "Free" : money(s.shipping);
    $("#cartTotal").textContent = money(s.total);
    $("#shipNote").textContent = s.subtotal === 0 ? "Free US shipping on orders over $75." : s.freeShippingGap ? "Add " + money(s.freeShippingGap) + " more for free US shipping." : "This order ships free in the US.";
    $("#checkoutBtn").disabled = !s.items.length;
  }
  function bumpBadge() { var b = $("#cartBadge"); b.classList.add("bump"); setTimeout(function () { b.classList.remove("bump"); }, 250); }
  function openDrawer() { $("#drawer").classList.add("on"); $("#scrim").classList.add("on"); $("#drawer").setAttribute("aria-hidden", "false"); }
  function closeDrawer() { $("#drawer").classList.remove("on"); $("#scrim").classList.remove("on"); $("#drawer").setAttribute("aria-hidden", "true"); }
  var toastT; function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2600); }

  // ── quick view
  var qvSel = {};
  function openQuickView(sku) {
    var p = bySku[sku]; if (!p) return;
    qvSel = { sku: sku, variant: firstAvailable(p) };
    var d = $("#qv");
    $(".photo img", d).src = img(p, 960); $(".photo img", d).srcset = srcset(p); $(".photo img", d).alt = p.title;
    $("#qvCat").textContent = catName(p.category);
    $("#qvTitle").textContent = p.title;
    $("#qvPrice").innerHTML = money(p.price) + (p.compareAt ? "<s>" + money(p.compareAt) + "</s>" : "");
    $("#qvDesc").textContent = p.description;
    $("#qvSpecs").innerHTML = p.specs.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "<li>Weight " + esc(p.weight) + "</li>";
    // The quick-view "Ask the assistant about this" carries a product-specific
    // prompt; the shared /_shared/ui/open-chat.js opens the widget and submits
    // it via BusymateAI.ask() (never open-only — the #2953 regression).
    $("#qvAsk").setAttribute("data-open-chat", "Tell me about the " + p.title + " — is it in stock, and how does it fit?");
    renderQvOptions(p);
    d.showModal();
  }
  function renderQvOptions(p) {
    var box = $("#qvOpts"); var colors = p.options.colors || [], sizes = p.options.sizes || [];
    var parts = qvSel.variant.split(" / ");
    var selColor = colors.length ? parts[0] : null, selSize = sizes.length ? parts[colors.length ? 1 : 0] : null;
    var html = "";
    if (colors.length) html += '<div class="opt"><b>Color</b><div class="sw">' + colors.map(function (c) { var v = sizes.length ? c + " / " + (selSize || sizes[0]) : c; var st = stockOf(p, v); return '<button data-color="' + esc(c) + '" aria-pressed="' + (c === selColor) + '" class="' + (st === "sold_out" ? "sold" : "") + '">' + esc(c) + "</button>"; }).join("") + "</div></div>";
    if (sizes.length) html += '<div class="opt"><b>Size</b><div class="sw">' + sizes.map(function (s) { var v = colors.length ? (selColor || colors[0]) + " / " + s : s; var st = stockOf(p, v); return '<button data-size="' + esc(s) + '" aria-pressed="' + (s === selSize) + '" class="' + (st === "sold_out" ? "sold" : "") + '">' + esc(s) + "</button>"; }).join("") + "</div></div>";
    box.innerHTML = html;
    var st = stockOf(p, qvSel.variant);
    var pill = $("#qvStock"); pill.className = "pill " + (st === "in_stock" ? "ok" : st === "sold_out" ? "bad" : "warn");
    pill.innerHTML = '<span class="dot"></span>' + esc(STOCK_WORDS[st] + (st === "backorder" ? " · ships in " + (p.backorderShips || "a few weeks") : st === "low" ? " · only a few left" : ""));
    $("#qvAdd").disabled = st === "sold_out"; $("#qvAdd").textContent = st === "backorder" ? "Backorder — " + money(p.price) : "Add to cart — " + money(p.price);
    $$("#qvOpts button").forEach(function (b) {
      b.onclick = function () {
        var c = b.dataset.color !== undefined ? b.dataset.color : selColor, s = b.dataset.size !== undefined ? b.dataset.size : selSize;
        qvSel.variant = colors.length && sizes.length ? c + " / " + s : colors.length ? c : s;
        renderQvOptions(p);
      };
    });
  }

  // ── identity: define getIdentity BEFORE the embed script loads
  // (https://busymate.ai/docs/guides/identified-visitors). A signed-in visitor
  // mints a fresh 120s launch proof from THIS site's own /api/identity/mint.
  function nonce() { var b = new Uint8Array(32); crypto.getRandomValues(b); return btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
  async function session() { try { var r = await fetch("/api/identity/session"); if (!r.ok) return { signedIn: false }; return await r.json(); } catch (e) { return { signedIn: false }; } }
  window.BusymateAI = window.BusymateAI || {};
  window.BusymateAI.getIdentity = async function () {
    var s = await session(); if (!s.signedIn) return null;
    var res = await fetch("/api/identity/mint", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce: nonce() }) });
    if (!res.ok) return null; var out = await res.json(); return { token: out.token, nonce: out.nonce };
  };
  async function renderIdentity() {
    var s = await session();
    var chip = $("#idChip"), text = $("#idChipText"), panel = $("#idPanelText");
    var inBtns = $$("[data-signin]"), outBtns = $$("[data-signout]");
    if (s.signedIn) {
      chip.classList.add("on"); text.textContent = "Signed in · " + s.customer.name;
      panel.textContent = "Signed in as " + s.customer.name + " (" + s.customer.email + ") — the assistant now answers about this customer's own orders.";
      inBtns.forEach(function (b) { b.hidden = true; }); outBtns.forEach(function (b) { b.hidden = false; });
    } else {
      chip.classList.remove("on"); text.textContent = "Browsing as a guest";
      panel.textContent = "Signed out — the assistant only sees what a guest can see.";
      inBtns.forEach(function (b) { b.hidden = false; }); outBtns.forEach(function (b) { b.hidden = true; });
    }
  }
  async function signIn() { await fetch("/api/identity/login", { method: "POST" }); await renderIdentity(); if (window.BusymateAI.refreshIdentity) window.BusymateAI.refreshIdentity(); toast("Signed in as " + N.demoCustomer.name); }
  async function signOut() { await fetch("/api/identity/logout", { method: "POST" }); await renderIdentity(); if (window.BusymateAI.refreshIdentity) window.BusymateAI.refreshIdentity(); }

  // ── WebMCP page tools live in assets/page-tools.js (data in page-tools.data.js,
  // which also feeds /webmcp-catalog.json); they act through window.Northline below.

  // ── wire up
  document.addEventListener("DOMContentLoaded", function () {
    renderAll(); renderCart(); renderIdentity();
    document.body.addEventListener("click", function (e) {
      var t = e.target.closest("[data-add],[data-qv],[data-filter],[data-open-cart],[data-close-cart],[data-signin],[data-signout],[data-q],[data-rm]");
      if (!t) return;
      if (t.dataset.add) { addToCart(t.dataset.add, 1); }
      else if (t.dataset.qv) { openQuickView(t.dataset.qv); }
      else if (t.dataset.filter) { applyFilter(t.dataset.filter); if (t.classList.contains("cat")) { e.preventDefault(); $("#shop").scrollIntoView({ behavior: "smooth" }); } }
      else if (t.hasAttribute("data-open-cart")) openDrawer();
      else if (t.hasAttribute("data-close-cart")) closeDrawer();
      else if (t.hasAttribute("data-signin")) signIn();
      else if (t.hasAttribute("data-signout")) signOut();
      else if (t.dataset.q) { var c = getCart(), i = Number(t.dataset.i); c[i].qty = Math.max(0, c[i].qty + Number(t.dataset.q)); if (!c[i].qty) c.splice(i, 1); setCart(c); }
      else if (t.dataset.rm) { var c2 = getCart(); c2.splice(Number(t.dataset.rm), 1); setCart(c2); }
    });
    document.body.addEventListener("keydown", function (e) { var t = e.target; if (t.matches && t.matches(".ph[data-qv]") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openQuickView(t.dataset.qv); } });
    $("#qvAdd").addEventListener("click", function () { var r = addToCart(qvSel.sku, 1, qvSel.variant, { open: true }); if (r.ok) $("#qv").close(); });
    $("#qvClose").addEventListener("click", function () { $("#qv").close(); });
    $("#qv").addEventListener("click", function (e) { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $("#checkoutBtn").addEventListener("click", function () { toast("This is a demo store — checkout isn't wired up, but everything else is."); });
    window.addEventListener("storage", function (e) { if (e.key === CART_KEY) renderCart(); });
  });

  // Public surface for the page's own scripts + proofs.
  window.Northline = { addToCart: addToCart, cart: cartSummary, openCart: openDrawer, products: N.products };
})();
