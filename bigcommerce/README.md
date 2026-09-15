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
storefront theme/logo/colours are still default — branding pass not done yet. **The
storefront itself is BigCommerce "prelaunch"** (shows a Coming Soon / guest-access-code
gate to every visitor) — a control-panel-only Launch step, not API-reachable
(`PUT /v2/store` is 405; no maintenance/coming-soon endpoint exists on v2 or v3).

## What's built and wired (phases 2-6 of the brief)

- **Backend connector** `sites/bigcommerce/backend/{bigcommerce,tools,index,wellKnown}.mjs`
  — self-hosted MCP + identity server (shared `mcp-identity-server.mjs`, shape of
  `sites/shopify/backend`), live on the demo host as `demo-bigcommerce-backend`
  (127.0.0.1:8110), fronted by `bigcommerce.demo.busymate.ai` (real TLS cert). Reads
  products/categories/orders LIVE from the Admin API — nothing hardcoded. Serves the
  six agent-ready files + `/api/bmai/status` + a same-origin `/preview` page itself
  (the real storefront can serve none of these while prelaunch).
- **Universal embed + WebMCP tools** — both installed as real BigCommerce Script Manager
  entries (Content Scripts API) on the live store: the `busymate.ai/embed/v1.js` loader
  and `sites/bigcommerce/public/webmcp-tools.js` (view_cart/add_to_cart against BC's own
  Storefront Cart API, track_order against this backend's `/mcp`). Installed, unverifiable
  live on the real storefront until prelaunch lifts — verified instead on `/preview`
  (identical wiring).
- **Tenant on busymate.ai** — `demo-bigcommerce` (`a0910f44-1cc6-4b6f-8ead-303ebf188778`),
  provisioned + published (revision 5) via the owner MCP runner: a real MCP connector
  (`f04a79ca-8dc5-48b0-82da-09095c3dac4f`, delegation_mode `signed_actor_token`, all 5
  tools mapped), a real identity provider (`05b66868-…`, `test_tenant_identity_provider`
  **passed 6/6**, including the `identified-launch` preflight scenario), and 2 knowledge
  sources (the live catalogue + delivery/policy text). `set_tenant_branding` is refused
  live (`native_action_unavailable`) so branding rides in `publish_tenant_runtime`'s
  `config.brand` instead (confirmed rendering correctly on the hosted chat).
- **Grounded chat proven live**: `demo-bigcommerce.busymate.ai/chat` answers real
  catalogue questions correctly (e.g. "Cast Iron Skillet 12-Inch (SKU CKC-CIS-12) is
  $68.00" — matches the live store exactly).

## The one thing NOT proven — identified order lookup

On `/preview` (signed in as the demo customer, real embed widget, real form card): asking
about order 101 correctly triggers `get_order_status`'s form card, correctly collects the
order number + email, then the assistant reports **"I'm unable to look up order details
from this chat — that requires your Copperfield Kitchen Co. account to be passed through
to support."** — the tool call reaches the connector and is refused for lack of a verified
signed-in actor. Root cause: **`set_connector_actor_verifier` (the tool that registers this
connector's HS256 secret with the platform) returns `native_action_unavailable` on the
live busymate.ai/mcp right now** — same failure shape as `set_tenant_branding` and
`get_tenant_config`, apparently a live bug in a class of "native" platform actions
(possibly related to the unmerged `fix/console-native-branding-unavailable`, #3014, but
broader than that branch's title). This backend's own env already holds a self-generated
matching secret (`BMAI_SUPPORT_ACTOR_SECRET`/`_TENANT_ID`/`_CONNECTOR_ID`, `/api/bmai/status`
reports `actorVerifier:true`) — the platform side of the handshake is what's missing.
**Retry `set_connector_actor_verifier` once that platform-side bug is fixed** — no
devtools-side change is needed, only a re-run of that one tool call.

## Continuing this lane

- Store credentials: read them from the Vault via the devtools MCP tools in code that
  runs server-side only (never re-print the values; they are write-only once stored).
  **Exact commands, ports and box paths live in the devtools private ops runbook
  `demos-hosting` — this file is the design, not the transcript** (same convention as
  `sites/woo/README.md`).
- `seed/catalog-defs.py` is a record of the 12 live products, not yet an idempotent
  upserter — add SKU-based upsert before re-running it against a second store.
- Shipping method + tax rate + store display name + theme branding + the storefront Launch
  step are all UI-only on the BigCommerce control panel — needs a real login session (this
  lane's saved `bmai-owner` browser session was lost mid-lane; no password available).
- Native BigCommerce app (dev portal, OAuth single-click install) — also blocked on a
  BigCommerce login (devtools.bigcommerce.com), not attempted.
- Once `set_connector_actor_verifier` works platform-side: re-run it, then re-verify
  order lookup on `/preview`, then move the exact same proof to the real storefront once
  it's launched.
