/*
 * The two things this page actually DOES, shared by the URL form, the
 * example cards, and the WebMCP tools (page-tools.js) — one place, so a
 * tool call and a click do exactly the same thing.
 */
const EXAMPLES = {
  "busydrivers.com": { label: "BusyDrivers", card: "#example-busydrivers" },
  "web.demo.busymate.ai": { label: "Northwind Coffee", card: "#example-web" },
  "shopify.demo.busymate.ai": { label: "Northline Outdoor", card: "#example-shopify" },
};

function normalizeHost(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withScheme).hostname.replace(/^www\./i, "");
    return host || null;
  } catch {
    return null;
  }
}

/** Opens the REAL platform quick start — never a fabricated result. */
export function launchQuickstart(rawUrl) {
  const host = normalizeHost(rawUrl);
  if (!host) return { error: "invalid_url", detail: "That did not look like a website address — try something like acme.com." };
  const target = `https://busymate.ai/try/${encodeURIComponent(host)}`;
  window.open(target, "_blank", "noopener");
  return { ok: true, host, opened: target };
}

export function listExamples() {
  return Object.entries(EXAMPLES).map(([site, ex]) => ({
    site,
    label: ex.label,
    tryUrl: `https://busymate.ai/try/${site}`,
  }));
}

// ── Identity (a demo visitor, not an account) ──────────────────────────────
export const state = { customer: null };

export function flash(text) {
  const el = document.getElementById("flash");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => { el.hidden = true; }, 3200);
}

export async function refreshAccount() {
  const res = await fetch("/api/identity/session", { credentials: "same-origin" });
  const body = await res.json();
  state.customer = body.signedIn ? body.customer : null;
  document.body.dataset.signedIn = state.customer ? "yes" : "no";
  const who = document.getElementById("account-who");
  if (who) who.textContent = state.customer ? `Signed in as ${state.customer.name}.` : "";
  return state.customer;
}

export async function signIn() {
  await fetch("/api/identity/login", { method: "POST", credentials: "same-origin" });
  await refreshAccount();
  if (window.BusymateAI?.refreshIdentity) await window.BusymateAI.refreshIdentity();
  flash(`Signed in as ${state.customer?.name ?? "the demo visitor"}`);
}

export async function signOut() {
  await fetch("/api/identity/logout", { method: "POST", credentials: "same-origin" });
  await refreshAccount();
  if (window.BusymateAI?.refreshIdentity) await window.BusymateAI.refreshIdentity();
  flash("Signed out — the assistant is back to a plain visitor");
}

export function revealExample(site) {
  const ex = EXAMPLES[site];
  if (!ex) return { error: "unknown_example", detail: "That is not one of the three pre-scanned examples on this page." };
  const el = document.querySelector(ex.card);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-highlighted");
    setTimeout(() => el.classList.remove("is-highlighted"), 2200);
  }
  return { ok: true, site, label: ex.label, tryUrl: `https://busymate.ai/try/${site}` };
}

/** Beacon's own MCP server, same-origin — the page's own actions call the SAME
 *  tool table an external agent would, so a page-tool result can never disagree
 *  with the MCP one. */
async function callMcp(name, args) {
  const res = await fetch("/mcp", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  const body = await res.json();
  if (body.error) return { error: "mcp_error", detail: body.error.message };
  const text = body.result?.content?.[0]?.text;
  try { return JSON.parse(text); } catch { return { error: "bad_response" }; }
}

export function getReadiness(url) {
  return callMcp("get_readiness", { url });
}

// my_recent_scans is deliberately NOT called from the page: it is a
// `delegated` MCP tool, answered only for the platform's own signed actor
// token (the assistant calling on a signed-in visitor's behalf) — a plain
// same-origin fetch from the page carries no such token and would always
// read as signed out. Ask the assistant "what have I scanned?" instead.
