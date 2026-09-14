// sites/web/backend/routes.mjs
//
// The storefront's own HTTP API — what the page's JavaScript and its WebMCP
// page tools read. The catalogue and the policies are open; the order book and
// returns need the demo customer's session cookie, the same cookie the shared
// server issues from "Sign in as the demo customer".
import {
  extras, getPolicy, getProduct, orderFor, ordersFor, policies, products,
  returnsFor, searchProducts, startReturn, store,
} from "./store.mjs";

const PREFIX = "/api/store/";

/**
 * The tenant login the assistant sends a visitor to.
 *
 * When the assistant needs to know who is asking, the chat posts an auth
 * request and either the embed OR the platform's hosted assistant page
 * navigates here with a `return_to` (+ the one-time `bmai_nonce` it minted).
 * A real store would show its own login form; this demo has one throwaway
 * customer and no password, so it signs them straight in and hands the proof
 * back in the URL FRAGMENT — never the query string, where it would reach a
 * referrer or a log.
 *
 * `return_to` is honoured EXACTLY when its origin is this demo's own or one of
 * `ctx.hostedOrigins` (the tenant's hosted-assistant page) — anything else
 * falls back to this store's front page — and the supplied nonce is ECHOED,
 * never re-minted: pinning `return_to` to this demo alone, and minting a fresh
 * nonce instead of echoing it, is exactly what shipped broken and dropped
 * every hosted-page sign-in on the platform side (#2865).
 */
async function startLogin(url, ctx) {
  const requested = url.searchParams.get("return_to") ?? "/";
  const destination = ctx.resolveReturnTo(requested);

  const cookie = ctx.signIn();
  const proof = ctx.mintLaunchProof(ctx.nonceOrFresh(url.searchParams.get("bmai_nonce")));
  const fragment = new URLSearchParams({ bmai_token: proof.token, bmai_nonce: proof.nonce });
  destination.hash = fragment.toString();
  return { cookie, location: destination.href };
}

export async function routes(req, res, url, ctx) {
  const path = url.pathname;

  if (path === "/api/identity/start") {
    const { cookie, location } = await startLogin(url, ctx);
    res.writeHead(303, {
      Location: location,
      "Set-Cookie": cookie,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    }).end();
    return true;
  }

  if (!path.startsWith(PREFIX)) return false;
  const rest = path.slice(PREFIX.length).replace(/\/+$/, "");
  const method = req.method ?? "GET";
  const signedIn = () => {
    if (ctx.customer) return true;
    ctx.json(401, { error: "not_signed_in" });
    return false;
  };

  if (rest === "products") {
    const q = url.searchParams.get("q") ?? "";
    const decafOnly = url.searchParams.get("decaf") === "1";
    ctx.json(200, {
      currency: store.currency,
      products: q || decafOnly ? searchProducts(q, { decaf: decafOnly ? true : null }) : products,
    });
    return true;
  }

  if (rest.startsWith("products/")) {
    const product = getProduct(decodeURIComponent(rest.slice("products/".length)));
    ctx.json(product ? 200 : 404, product ?? { error: "not_found" });
    return true;
  }

  if (rest === "policies") { ctx.json(200, policies); return true; }

  // The shop's surroundings: what people said, and what they keep asking.
  if (rest === "extras") { ctx.json(200, extras()); return true; }

  if (rest.startsWith("policies/")) {
    const text = getPolicy(decodeURIComponent(rest.slice("policies/".length)));
    ctx.json(text ? 200 : 404, text ? { text } : { error: "unknown_policy" });
    return true;
  }

  if (rest === "orders") {
    if (!signedIn()) return true;
    ctx.json(200, { orders: ordersFor(ctx.customer.id) });
    return true;
  }

  if (rest.startsWith("orders/")) {
    if (!signedIn()) return true;
    const order = orderFor(ctx.customer.id, decodeURIComponent(rest.slice("orders/".length)));
    ctx.json(order ? 200 : 404, order ?? { error: "not_found" });
    return true;
  }

  if (rest === "returns") {
    if (!signedIn()) return true;
    if (method === "GET") { ctx.json(200, { returns: returnsFor(ctx.customer.id) }); return true; }
    if (method !== "POST") { ctx.json(405, { error: "method_not_allowed" }); return true; }
    let body = {};
    try { body = JSON.parse((await ctx.body()) || "{}"); } catch { ctx.json(400, { error: "bad_json" }); return true; }
    const result = startReturn(ctx.customer.id, body);
    ctx.json(result.ok ? 201 : 400, result);
    return true;
  }

  return false;
}
