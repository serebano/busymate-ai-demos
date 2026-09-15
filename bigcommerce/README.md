# BigCommerce demo — Copperfield Kitchen Co.

Tracking issue: `serebano/busymate-devtools#3013`. Store: the owner's real BigCommerce
15-day trial, store hash `wflwr11fds` (control panel
`https://store-wflwr11fds.mybigcommerce.com/manage/dashboard`, storefront
`https://12zero784.mybigcommerce.com`). Trial started 2026-09-15 — don't let it lapse
unused.

## What's LIVE right now (verified against the real store)

- **Store-level API account** `copperfield-demo-connector` created (note: the BigCommerce
  control-panel label on the live account is the literal string this repo's mirror gate
  won't let into the public repo — same account, cosmetic label mismatch only) (Content=modify,
  Customers=modify+login, Information & settings=modify, Orders=modify, Products=modify,
  Themes=modify, Storefront API tokens=manage). Client ID / secret / access token are in
  the devtools Vault as `BIGCOMMERCE_DEMO_CLIENT_ID` / `BIGCOMMERCE_DEMO_CLIENT_SECRET` /
  `BIGCOMMERCE_DEMO_ACCESS_TOKEN` (write-only — rotate via `update_app_secret` if lost, not
  readable back).
- BigCommerce's default sample catalog (13 `[Sample]` products) deleted.
- 6 default sample categories renamed to fit the brand: Bath→**Cookware** (id 18),
  Garden→**Bakeware** (id 19), Publications→**Tabletop & Dining** (id 20),
  Kitchen→**Kitchen Tools** (id 21), Utility→**Storage & Organization** (id 22),
  **Shop All** unchanged (id 23).
- **12 real products** created via the Admin API, each with a real credited free-licence
  photo (`seed/IMAGE-CREDITS.md`), a SKU, price, weight and category — see
  `seed/catalog-defs.py` for the full definitions and BigCommerce product ids.
- A second shipping zone **United States & Canada** (id 2) alongside the default
  Moldova zone — no shipping *method* attached yet (the V2 `shipping/zones/{id}/methods`
  endpoint kept 400ing on `type: flatrate` / `shipping_flatrate` from the API; the control
  panel's Settings → Shipping UI is the reliable path — do that by hand next).
- Default tax classes exist (BigCommerce defaults: Default/Non-taxable/Shipping/Gift
  Wrapping) but no tax rate is configured — "basics" only, needs a real rate.
- **2 test orders**: `#100` (Maya Ionescu, MD, Cast Iron Skillet + 2× Whisk Set, $112.00,
  Awaiting Fulfillment) and `#101` (Daniel Weber, Austin TX US, Copper Stockpot + Ceramic
  Baking Dish + Bamboo Cutting Board, Shipped) — **order #101 is the one to demo "ask
  about a real order" against** once the chat is wired up.

Store display name is still the BigCommerce-assigned placeholder (`12Zero784@`) and the
storefront theme/logo/colours are still default — branding pass not done yet.

## What is NOT built yet — the real remaining work

1. **Storefront embed** (Storefront → Script Manager, our loader + tenant id) — not
   inserted yet.
2. **Native BigCommerce app** — no app created yet at `devtools.bigcommerce.com`. Needs:
   OAuth single-click install, Scripts API (install loader on install), Widgets API (a
   "Chat with your mate" widget in Page Builder), hosted on the demo demo host backend.
3. **Backend connector container** — no `sites/bigcommerce/backend/*` exists yet. Copy the
   shape of `sites/woo/backend/{index,routes,tools,woo}.mjs` +
   `sites/_shared/backend/mcp-identity-server.mjs`, swapping WooCommerce's REST reader for
   BigCommerce's Admin API v3 (products/orders, already proven reachable above) +
   Storefront GraphQL (cart/customer). Needs a `container` block in `demo.json` (ports,
   nginx vhost, `<demo-host>/bigcommerce/...`) once written, and a demo host deploy.
4. **WebMCP page tools** (`document.modelContext`: add-to-cart, view order, track order) —
   not registered anywhere yet; depends on #1/#3.
5. **Identified sign-in** — BigCommerce Customer Login API / current-customer JWT → our
   ES256 launch JWT (the Larkspur recipe) — not wired.
6. **Six-layer agent-ready files** served by the backend proxy (`sites/_shared/gen-agent-
   files.mjs`, `gen-protocol-files.mjs`, etc., same as `sites/woo/public/*`) — not
   generated yet; depends on #3.
7. **Tenant on busymate.ai** (owner MCP runner: create tenant, identity provider,
   `test_tenant_identity_provider`, publish knowledge, probe connector) — not created yet.
8. **Devtools side** (`ai` component): `bigcommerce` row in `demos.ts` DEMOS_FALLBACK +
   live manifest, `registryCatalog.ts` row, `content/docs/guides/bigcommerce.md` +
   `GUIDE_PAGES`, i18n seed, real BigCommerce brand mark — none of this landed yet.
9. **Proof screenshot** — the assistant answering about order #101 on the live storefront,
   widget open, shopper identified — blocked on #1-#5.

## Continuing this lane

- Store credentials: read them from the Vault via the devtools MCP tools in code that
  runs server-side only (never re-print the values; they are write-only once stored).
- `seed/catalog-defs.py` is a record of the 12 live products, not yet an idempotent
  upserter — add SKU-based upsert before re-running it against a second store.
- Shipping method + tax rate + store display name + theme branding are the fastest next
  UI-only steps (control panel, `bmc` on the `bmai-owner` browser, tab session
  `91FB5B5D202DC79DD6BDBAF4E6EC05E3`).
- The backend connector (#3) is the critical path for everything after it (#4-#9) — start
  there next.
