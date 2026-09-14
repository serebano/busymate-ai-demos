/*
 * The card shapes every demo storefront needs: a product, a category tile and a
 * testimonial. Markup only — the palette comes from the demo's own stylesheet,
 * so two demos using these do not end up looking like each other.
 */
import { avatarUrl } from "./avatar.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n, currency = "USD") => (currency === "USD" ? `$${n}` : `${n} ${currency}`);

export function productCard(product, { currency = "USD", imageBase = "/img" } = {}) {
  return `<article class="card product" data-sku="${esc(product.sku)}">
    <a class="shot" href="#coffee" aria-hidden="true" tabindex="-1">
      <img src="${imageBase}/${esc(product.image)}.webp" alt="" width="380" height="380" loading="lazy" decoding="async">
    </a>
    <div class="meta">
      <span class="origin">${esc(product.originDetail ?? product.origin)}</span>
      <h3>${esc(product.name)}</h3>
      <p class="note">${esc(product.notes)}</p>
      <dl class="spec">
        <div><dt>Roast</dt><dd>${esc(product.roast)}</dd></div>
        <div><dt>Process</dt><dd>${esc(product.process ?? "-")}</dd></div>
        <div><dt>Best for</dt><dd>${esc(product.bestFor ?? "-")}</dd></div>
      </dl>
      <div class="row">
        <span class="cost">${money(product.price, currency)} <small>${esc(product.size)}</small></span>
        <button class="btn" type="button" data-add="${esc(product.sku)}">Add to cart</button>
      </div>
    </div>
  </article>`;
}

export function categoryTile({ id, title, blurb, href = "#coffee" }) {
  return `<a class="tile" href="${esc(href)}">
    <img src="/img/${esc(id)}.webp" alt="" width="410" height="328" loading="lazy" decoding="async">
    <span class="tile-body"><strong>${esc(title)}</strong><span>${esc(blurb)}</span></span>
  </a>`;
}

export function testimonialCard({ name, role, quote }) {
  return `<figure class="quote">
    <blockquote>${esc(quote)}</blockquote>
    <figcaption>
      <img class="avatar" src="${avatarUrl(name)}" alt="" width="44" height="44" loading="lazy">
      <span><strong>${esc(name)}</strong><span>${esc(role)}</span></span>
    </figcaption>
  </figure>`;
}
