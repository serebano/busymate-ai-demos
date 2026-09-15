/*
 * Canonical "open the chat" CTA — shared by every demo (busymate-devtools#2953).
 *
 * A `[data-open-chat]` control opens the live widget and, when its attribute
 * VALUE is a non-empty prompt, submits that prompt IMMEDIATELY through the live
 * busymate.ai/embed/v1.js `ask()` — the guarded write-proposal append seam the
 * frame delivers to (the same path a typed send takes), never a synthetic
 * keypress — so the visitor lands on the assistant already answering, never an
 * empty composer. An empty `data-open-chat` (no value) simply opens the widget.
 *
 * ONE delegated, idempotent document listener wires every current and future
 * control, so a demo needs only the markup + this one script tag — no per-demo
 * open() wiring (that open-only shape is exactly the #2953 regression: the chat
 * opened and nothing was sent). Brings an on-page phone-frame embed into view
 * first (the channel demos). A cached pre-#2662 embed (no `ask`) degrades to
 * open()+clipboard rather than doing nothing.
 *
 * Identity is untouched: a prompt that needs a signed-in visitor still shows
 * the normal in-chat sign-in card first and delivers after the gate clears; a
 * general prompt fires with no sign-in. That gating lives in the frame, not
 * here — this only ever asks.
 */
(function () {
  if (window.__bmOpenChatWired) return;
  window.__bmOpenChatWired = true;

  function bringEmbedIntoView() {
    var slot = document.querySelector('iframe[src*="busymate.ai/support"]');
    if (!slot) return;
    var r = slot.getBoundingClientRect();
    if (r.top < 0 || r.bottom > (window.innerHeight || 0)) slot.scrollIntoView({ block: "center" });
  }

  function openChat(prompt) {
    bringEmbedIntoView();
    var ai = window.BusymateAI;
    if (prompt) {
      if (ai && typeof ai.ask === "function") { ai.ask(prompt); return; }
      if (ai && typeof ai.open === "function") ai.open();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).catch(function () {});
      }
      return;
    }
    if (ai && typeof ai.open === "function") ai.open();
  }

  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-open-chat]") : null;
    if (!el) return;
    e.preventDefault();
    openChat((el.getAttribute("data-open-chat") || "").trim());
  });

  // Exposed so a demo that mounts a CTA prompt dynamically (e.g. a per-product
  // quick-view) can drive the same one path instead of re-implementing open().
  window.__bmOpenChat = openChat;
})();
