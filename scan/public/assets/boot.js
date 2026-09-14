/* Wires the page together and hands its actions to the assistant. */
import { launchQuickstart, refreshAccount, revealExample, signIn, signOut } from "./boot-actions.js";
import { register as registerPageTools } from "./page-tools.js";

function wireForm() {
  const form = document.getElementById("scan-form");
  const input = document.getElementById("scan-url");
  const status = document.getElementById("scan-status");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = launchQuickstart(input?.value ?? "");
    if (result.error) {
      status.textContent = result.detail;
      status.classList.add("is-error");
    } else {
      status.textContent = `Opened busymate.ai/try/${result.host} in a new tab.`;
      status.classList.remove("is-error");
    }
  });
}

function wireChips() {
  document.querySelectorAll("[data-example]").forEach((el) => {
    el.addEventListener("click", () => revealExample(el.dataset.example));
  });
}

function wireOpenChat() {
  document.querySelectorAll("[data-open-chat]").forEach((b) =>
    b.addEventListener("click", () => window.BusymateAI?.open?.()),
  );
}

function wireAccount() {
  document.querySelectorAll("#signin-btn,[data-signin]").forEach((b) => b.addEventListener("click", signIn));
  document.querySelectorAll("#signout-btn,[data-signout]").forEach((b) => b.addEventListener("click", signOut));
}

wireForm();
wireChips();
wireOpenChat();
wireAccount();
await refreshAccount();
const pageTools = await registerPageTools();
// A checker (and a curious visitor with a console open) can see the outcome
// rather than having to infer it from an empty tool list.
window.__beaconPageTools = pageTools;
console.info("[beacon] page tools:", pageTools);
