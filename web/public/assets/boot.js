/* Wires the storefront together and hands the page's actions to the assistant. */
import { addToCart, flash, loadCatalog, refreshAccount, signIn, signOut } from "./store.js";
import { renderFeatures } from "./features.js";
import { categoryTile, testimonialCard } from "/_shared/ui/cards.js";
import { register as registerPageTools } from "./page-tools.js";

const HOSTED = "https://demos.busymate.ai";

async function expandIncludes() {
  await Promise.all(
    [...document.querySelectorAll("[data-include]")].map(async (slot) => {
      try {
        const res = await fetch(slot.dataset.include);
        if (!res.ok) return;
        const html = await res.text();
        const frag = document.createRange().createContextualFragment(html);
        slot.replaceWith(frag);
      } catch { /* the page reads fine without it */ }
    }),
  );
}

function wireChrome() {
  const dialog = document.getElementById("cart");
  document.getElementById("cart-btn")?.addEventListener("click", () => dialog?.showModal());
  document.getElementById("cart-close")?.addEventListener("click", () => dialog?.close());
  document.querySelectorAll("[data-open-chat]").forEach((b) =>
    b.addEventListener("click", () => window.BusymateAI?.open?.()),
  );
  document.querySelectorAll("#signin-btn,[data-signin]").forEach((b) => b.addEventListener("click", signIn));
  document.querySelectorAll("#signout-btn,[data-signout]").forEach((b) => b.addEventListener("click", signOut));
  document.querySelectorAll("[data-add-hero]").forEach((b) =>
    b.addEventListener("click", () => addToCart(b.dataset.addHero)),
  );
}

const CATEGORIES = [
  { id: "cat-espresso", title: "For espresso", blurb: "Blends built for 18g in, 36g out" },
  { id: "cat-filter", title: "For filter", blurb: "Single origins for pour-over and press" },
  { id: "cat-gift", title: "Samplers and gifts", blurb: "Four origins, or a subscription in a box" },
];

/** The catalogue's surroundings — tiles, reviews and the FAQ — from store data. */
async function renderShopFurniture() {
  const tiles = document.getElementById("tiles");
  if (tiles) tiles.innerHTML = CATEGORIES.map(categoryTile).join("");

  let extras = {};
  try {
    extras = await (await fetch("/api/store/extras")).json();
  } catch { /* the page still reads without them */ }

  const quotes = document.getElementById("quotes");
  if (quotes && Array.isArray(extras.testimonials)) {
    quotes.innerHTML = extras.testimonials.map(testimonialCard).join("");
  }

  const faq = document.getElementById("faq");
  if (faq && Array.isArray(extras.faq)) {
    faq.innerHTML = extras.faq
      .map((row) => `<details><summary>${row.q}</summary><p>${row.a}</p></details>`)
      .join("");
    // The same questions, as data, for anything reading the markup.
    const ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        const graph = JSON.parse(ld.textContent);
        const faqNode = graph["@graph"].find((n) => n["@type"] === "FAQPage");
        if (faqNode) {
          faqNode.mainEntity = extras.faq.map((row) => ({
            "@type": "Question",
            name: row.q,
            acceptedAnswer: { "@type": "Answer", text: row.a },
          }));
          ld.textContent = JSON.stringify(graph);
        }
      } catch { /* leave the served markup alone if it will not parse */ }
    }
  }
}

async function copyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
    flash("Prompt copied — paste it into the chat");
  } catch {
    flash("Ask the assistant: " + text);
  }
}

async function openHosted() {
  if (!window.BusymateAI?.openHosted) return;
  try {
    await window.BusymateAI.openHosted(HOSTED);
  } catch {
    flash("Sign in as the demo customer first — the full page carries that identity with it");
  }
}

await expandIncludes();
wireChrome();
renderFeatures(document.getElementById("features"), {
  onTry: async (feature) => {
    await copyPrompt(feature.prompt);
    window.BusymateAI?.open?.();
  },
  onHosted: openHosted,
});
await renderShopFurniture();
await loadCatalog();
await refreshAccount();
const pageTools = await registerPageTools();
// A checker (and a curious visitor with a console open) can see the outcome
// rather than having to infer it from an empty tool list.
window.__northwindPageTools = pageTools;
console.info("[northwind] page tools:", pageTools);
