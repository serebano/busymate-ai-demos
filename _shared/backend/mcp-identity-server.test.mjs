// sites/_shared/backend/mcp-identity-server.test.mjs
//
// Regression coverage for serebano/busymate-devtools#2865: the shared
// identity server pinned `return_to` to the demo's own origin and MINTED the
// launch nonce instead of ECHOING it, so a hosted-page sign-in landed a
// genuinely signed-in customer on the wrong page with a token the platform
// then correctly refused. Dependency-free (node:test + node:assert), matching
// the rest of this file's "Node core only" contract.
//
//   node --test sites/_shared/backend/mcp-identity-server.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveReturnTo, nonceOrFresh } from "./mcp-identity-server.mjs";

const ISSUER = "https://shopify.demo.busymate.ai";
const HOSTED = ["https://demo-shopify.busymate.ai", "https://busymate.ai"];
const VALID_NONCE = "a".repeat(32); // matches ^[A-Za-z0-9_-]{32,200}$

test("resolveReturnTo: honours the platform's hosted-assistant page (the #2865 break)", () => {
  const requested = "https://busymate.ai/chat/abc123";
  const out = resolveReturnTo(requested, ISSUER, HOSTED);
  assert.equal(out.href, requested);
});

test("resolveReturnTo: honours the tenant's own <slug>.busymate.ai hosted page", () => {
  const requested = "https://demo-shopify.busymate.ai/support/demo-shopify";
  const out = resolveReturnTo(requested, ISSUER, HOSTED);
  assert.equal(out.href, requested);
});

test("resolveReturnTo: still honours this demo's own origin (the embed's own sign-in)", () => {
  const requested = "https://shopify.demo.busymate.ai/some/page?x=1";
  const out = resolveReturnTo(requested, ISSUER, HOSTED);
  assert.equal(out.href, requested);
});

test("resolveReturnTo: refuses a foreign origin, falling back to this demo's root", () => {
  const out = resolveReturnTo("https://evil.example/", ISSUER, HOSTED);
  assert.equal(out.origin, new URL(ISSUER).origin);
  assert.equal(out.pathname, "/");
});

test("resolveReturnTo: a prefix trick does not pass — evil.example carrying busymate.ai in the query is still evil.example", () => {
  const out = resolveReturnTo("https://evil.example/?x=https://busymate.ai", ISSUER, HOSTED);
  assert.equal(out.origin, new URL(ISSUER).origin);
});

test("resolveReturnTo: a lookalike host does not pass — busymate.ai.evil.test is not busymate.ai", () => {
  const out = resolveReturnTo("https://busymate.ai.evil.test/", ISSUER, HOSTED);
  assert.equal(out.origin, new URL(ISSUER).origin);
});

test("resolveReturnTo: with no hostedOrigins declared, only this demo's own origin passes (default stays safe)", () => {
  const out = resolveReturnTo("https://busymate.ai/chat/abc", ISSUER, []);
  assert.equal(out.origin, new URL(ISSUER).origin);
  assert.equal(out.pathname, "/");
});

test("resolveReturnTo: an unparseable return_to falls back to this demo's root", () => {
  const out = resolveReturnTo("http://[", ISSUER, HOSTED);
  assert.equal(out.origin, new URL(ISSUER).origin);
  assert.equal(out.pathname, "/");
});

test("nonceOrFresh: echoes a well-formed nonce verbatim (the #2865 break was minting a fresh one here)", () => {
  assert.equal(nonceOrFresh(VALID_NONCE), VALID_NONCE);
});

test("nonceOrFresh: mints a fresh nonce when none was supplied (the direct full-page open)", () => {
  const minted = nonceOrFresh(undefined);
  assert.match(minted, /^[A-Za-z0-9_-]{32,200}$/);
  assert.notEqual(minted, VALID_NONCE);
});

test("nonceOrFresh: mints fresh rather than echo a malformed candidate", () => {
  const minted = nonceOrFresh("too-short");
  assert.match(minted, /^[A-Za-z0-9_-]{32,200}$/);
  assert.notEqual(minted, "too-short");
});
