# `woo` — Fernweh Supply Co., a real WooCommerce store

**Live: <https://woo.demo.busymate.ai>**

This is the playground's first **dynamic** demo: not a static docroot with a chat
widget on it, but a genuine WordPress + WooCommerce installation with its own
database, its own catalogue, a customer who can sign in, orders in five different
states, and a WooCommerce REST API that a connector can drive end to end.

**Fernweh Supply Co. is an invented brand** — a small travel-gear shop in Leipzig
that makes packs, merino layers, bottles and notebooks in batches. It is not a real
company, sells nothing, and takes no payment. Every photograph is a freely licensed
Wikimedia Commons file of a generic object, credited in
[`seed/IMAGE-CREDITS.md`](seed/IMAGE-CREDITS.md).

---

## How it differs from a static demo

| | static demo (`web`, `shopify`, …) | this one |
|---|---|---|
| `demo.json` `type` | `static` | `dynamic` |
| Served from | the demo host's static docroot, by nginx | its own container (exact port: ops runbook `demos-hosting`) |
| Touched by `scripts/deploy.sh` | yes — rsync + vhost + cert | **no** (deploy.sh filters on `type == "static"`) |
| Visitor content on the box | none | yes: WordPress DB + uploads, on its own volume |
| Brought up by | `scripts/deploy.sh` | [`provision.sh`](provision.sh) + [`seed/seed.sh`](seed/seed.sh) |

`deploy.sh` deliberately skips it. A deploy run must never rsync over a live
WordPress install or re-render this vhost from the static template — the static
template has no `proxy_pass` and would serve an empty docroot at the shop's URL.
The landing index and `demos.json` **do** include it: both read every
`sites/*/demo.json` regardless of type.

## Recreating the store from scratch

**Exact commands (paths, ports, access) live in the devtools private ops
runbook `demos-hosting` — this is the design, not the transcript.** In outline,
on the demo host, two idempotent scripts — running either again updates in
place and never duplicates anything:

1. `sites/woo/provision.sh` — swap file, containers, nginx vhost, Let's Encrypt
   cert. It adds swap first: the host is memory-constrained with none, and a
   plugin install or an image import spikes past what is free — the OOM killer
   takes MariaDB first, which is a very confusing way to lose a store.
2. `sites/woo/seed/seed.sh` — the shop itself: WordPress, WooCommerce,
   Storefront, catalogue, images, policy pages, shipping zones, customer,
   orders, REST key.

### The container shape

Two containers on a private network: a MariaDB 11 database (tuned down for a
small host — capped buffer pool and connection count) and a WordPress
(php8.3-apache) app server, each with its own named data volume so this demo
can never read another's content and vice versa. The exact `docker run` lines,
env vars and volume paths are in the ops runbook (this file is the "why", not
the "where").

`WP_EXTRA` is the `wp-config.php` snippet that makes WordPress correct behind the
edge proxy: it sets `$_SERVER['HTTPS']` from `X-Forwarded-Proto`, honours
`X-Forwarded-Host`, and pins `WP_HOME`/`WP_SITEURL` to `https://woo.demo.busymate.ai`.
Without it WordPress emits `http://` asset URLs on an `https://` page and the
checkout redirect-loops.

### nginx

Rendered from [`infra/nginx/wordpress-https.conf.template`](../../infra/nginx/wordpress-https.conf.template).
Everything proxies to the WordPress container; only the ACME HTTP-01 challenge
path is served from disk, so `certbot certonly --webroot` keeps working and
never edits the vhost. Exact paths/ports: ops runbook `demos-hosting`.

## Hardening

The store is administered **only** through `docker exec … wp-cli`, never through a
browser, so the whole admin surface is closed to the public and nothing is left
guessable:

| Path | Public response |
|---|---|
| `/wp-admin`, `/wp-admin/…` | 404 |
| `/wp-login.php`, `/wp-signup.php` | 404 |
| `/wp-cron.php`, `/xmlrpc.php` | 404 |
| `*.php` under `/wp-content/` | 404 |
| `/wp-json/…` | **open** — the REST API is the point |
| the storefront | open |

Blocking `wp-login.php` does **not** break the demo customer: WooCommerce's
my-account form posts back to `/my-account/`, not to `wp-login.php`, so signing in
as the shopper works normally. Comments, pingbacks and product reviews are all off;
Akismet is deactivated; file editing in the admin is disabled; automatic updates
are off so a background update cannot restart the container mid-demo.

Visitor input is untrusted: nothing entered in the shop is read back by any other
demo, and the privacy page says plainly that this is a demonstration and real
personal data should not be entered.

## What the seed builds

[`seed/seed.sh`](seed/seed.sh) is the whole shop, driven through wp-cli inside the
container. Data lives beside it so the content is reviewable as content:

| File | What it holds |
|---|---|
| [`seed/catalog.json`](seed/catalog.json) | store details, 4 categories, 14 products (SKU, price, stock, description, attributes, weight, dimensions), 4 shipping zones |
| [`seed/pages.json`](seed/pages.json) | Shipping, Returns & Repairs, Privacy and Terms, as real policy text |
| [`seed/images.json`](seed/images.json) | the pinned Commons file names, one per product |
| [`seed/fetch-images.sh`](seed/fetch-images.sh) | resolves those pins against the Commons API into `seed/img/` and regenerates `IMAGE-CREDITS.md` |
| [`seed/IMAGE-CREDITS.md`](seed/IMAGE-CREDITS.md) | generated: author + licence for every photograph |

It produces:

- **14 published products** across **Packs & Bags**, **Merino Layers**,
  **Bottles & Flasks** and **Notebooks & Paper** — each with a real 2–4 sentence
  description, a price, a SKU, live stock (one is deliberately at zero and one is
  down to three), weight, dimensions, attributes and a product image;
- **four shipping zones** (Germany, EU, UK & Switzerland, rest of world), each with
  a flat rate and a free-delivery threshold;
- **four policy pages** plus the WooCommerce shop/cart/checkout/my-account pages
  and a primary menu, with the **shop as the front page**;
- **a demo customer** with a billing and shipping address and **five orders** —
  `processing`, `completed`, `refunded` (with a real refund record behind it),
  `cancelled` and `on-hold` — all with real line items from the catalogue;
- **a read/write WooCommerce REST API key**, written to a mode-0600 file **on
  the demo host only** (exact path: ops runbook `demos-hosting`). It is never
  committed and never printed into the repo.

### Idempotency

Every object is looked up before it is written: products by SKU, categories and
pages by slug, media by attachment slug, shipping zones by name, the customer by
email, orders by a `_fernweh_demo` meta marker, and the API key by the presence of
`.wc-api-key`. Re-running the seed after editing `catalog.json` updates the store
in place.

### Two things the WooCommerce CLI cannot do

Both are worth knowing before anyone "simplifies" the script:

1. **Shipping zones.** `wp wc shipping_zone` has no parameter for zone
   *locations* and its method sub-resource 404s, so a CLI-built zone ships with no
   countries in it — live, green, and matching nobody's address. The seed drives
   `WC_Shipping_Zone` through `wp eval-file` instead.
2. **`stock_status`.** The CLI rejects it as an unknown parameter; WooCommerce
   derives it from `manage_stock` + `stock_quantity`. A product is out of stock
   here because its quantity is `0`, not because anything said so.

## Credentials

None of them are in this repo. `provision.sh` generates them on the demo host,
mode 0600, in the WordPress admin/database env file and the REST-key file.
Retrieving them is an operator step — see the ops runbook `demos-hosting` for
the exact command and paths.

The demo customer's address is `demo@woo.demo.busymate.ai` — a mailbox at the
store's own domain, so there is no third party in the story and no real person's
address anywhere in the data.

## Driving it

```bash
# source the REST-key file on the demo host first (path: ops runbook `demos-hosting`)
B=https://woo.demo.busymate.ai/wp-json/wc/v3
curl -s -u "$WC_CONSUMER_KEY:$WC_CONSUMER_SECRET" "$B/system_status" | jq .environment.version
curl -s -u "$WC_CONSUMER_KEY:$WC_CONSUMER_SECRET" "$B/products?sku=FW-PK-W28" | jq '.[0]|{sku,name,price,stock_quantity}'
curl -s -u "$WC_CONSUMER_KEY:$WC_CONSUMER_SECRET" "$B/orders" | jq -r '.[]|[.number,.status,.total]|@tsv'
```

Unauthenticated requests to `/wp-json/wc/v3/*` return `401`.


---

# The demonstration on top of the store

The store above is the material; everything below is what makes it a demo to the
standard in the [repo README](../../README.md). It is all in this folder, and all
of it is live.

## How this demo serves what a docroot would serve

This is the one demo `scripts/deploy.sh` never touches (`type: "dynamic"`), and
its WordPress container owns every path. So the six agent-readable layers cannot
come from `public/` over rsync the way every other demo's do — and they cannot be
dropped into the WordPress docroot either, because an `index.html` there would
shadow `index.php` and take the shop down.

They come **out of WordPress**, from two must-use plugins in
[`wp/mu-plugins/`](wp/mu-plugins/):

| Plugin | What it serves |
|---|---|
| [`fernweh-agent-surface.php`](wp/mu-plugins/fernweh-agent-surface.php) | `/llms.txt`, `/llms.txt.md`, `/llms-full.txt`, `/agents.json` **and** `/.well-known/agents.json`, `/webmcp-catalog.json`, a `robots.txt` that names thirteen AI crawlers, a `sitemap.xml` built from what is really published, the Markdown twin of every policy page, the page-tool bundle, the shop's own icon, and Open Graph + Twitter cards |
| [`fernweh-demo-experience.php`](wp/mu-plugins/fernweh-demo-experience.php) | the six WebMCP page tools, the one-click sign-in that provides the demo customer, the block per capability with a line to try and a link to its guide, the footer that says what the operator sees — and a repair for a bug in the Busymate AI plugin (below) |

The generated bytes ship in [`public/`](public/) and `provision.sh` copies them
**verbatim** into the plugin's `data/` directory, so they stay
infrastructure-as-code on a demo nothing deploys. `sitemap.xml` is the exception:
it is not a file at all, it is built per request from the pages, products and
categories WordPress actually has, with their real modified dates.

mu-plugins were chosen deliberately: they load before everything and cannot be
deactivated from an admin screen that, on this store, nobody can reach.

`scripts/check-agent-files.sh` knows about this. For a `type: "dynamic"` demo it
checks the **live origin over HTTPS** — the same seven files, the same
assertions, plus the page's own `<link>`s and a `mailto:` — because a file on
disk here would prove nothing about what the container serves.

```bash
scripts/check-agent-files.sh woo
# OK   woo: six-layer set complete and LIVE at https://woo.demo.busymate.ai
```

## Building it

```bash
node sites/woo/build.mjs            # Markdown twins, knowledge.json, llms*.txt, agents.json
node scripts/gen-webmcp-catalog.mjs woo
node sites/_shared/brand/build-brand.mjs woo    # favicon, touch icon, mark, OG card
git add sites/woo && git commit && git push
# then, on the demo host: pull + re-run sites/woo/provision.sh
# (exact command/paths: ops runbook `demos-hosting`)
```

`build.mjs` reads the **live** Store API rather than `seed/catalog.json`: three
products are on sale and the seed file does not know it, so a build from the
seed would ship prices the shop does not charge. It refuses to write anything if
the catalogue is unreachable rather than emit a stale one.

## The demo's own MCP server

A second container, `demo-woo-backend`, built from [`backend/`](backend/) (its
loopback port is in the ops runbook `demos-hosting`, not here). nginx routes
exactly two paths to it — `/mcp` and `/api/bmai/status` — and everything else
stays WordPress's.

| Tool | Access | Reads |
|---|---|---|
| `search_products` | public | the shop's **public** Store API — no credential at all |
| `get_product` | public | the same |
| `get_delivery_and_returns` | public | the four zones and the returns policy |
| `list_my_orders` | delegated | `wc/v3`, scoped to ONE customer id |
| `get_order_status` | delegated | the same, with an action card |
| `start_return` | delegated | writes a customer-visible note on the real order, with an action card |

The customer id on a delegated call comes from the platform's **signed actor
token**, never from a tool argument the model controls. Two gates make sure the
server never advertises what it cannot serve: without the store's REST key the
three order tools are removed from the table before the server starts, and
without a complete actor verifier they are implemented but not listed.

`GET /api/bmai/status` is the readiness probe the control plane refuses to
register a `signed_actor_token` connector without. It is computed, never
declared — `actorVerifier` is true only when this process holds the four values
its verifier needs, `identity` only when the store's key set really answers.

## Identity — both halves, and who owns them

Identity on this demo is **WordPress's**, not the backend's. The Busymate AI
plugin on the store holds the ES256 key, serves `/.well-known/jwks.json` and
mints at `/wp-json/busymate/v1/launch`; nginx routes those to the WordPress
container and the MCP container's own identity routes are unreachable.

- **`getIdentity`** — the plugin prints a bridge before the embed loader, and a
  signed-in customer's widget mints a 120-second proof over the store's own
  session.
- **the redirect** — `/fernweh-demo-signin?return_to=…&bmai_nonce=…` signs the
  visitor in as the one provided customer, mints the same proof through the same
  filter, **echoes the nonce it was given**, and hands both back in the URL
  **fragment**, so neither reaches a server log. It can only ever sign in one
  account; there is no parameter that selects a user, and `return_to` is followed
  only for three NAMED origins — this store, `fernweh.busymate.ai` and
  `busymate.ai` — compared on the parsed origin, never a prefix.

Both proofs carry `name` and `email`. The email is not decoration: the order
desk resolves a customer's VERIFIED email from the claims the store signed and
takes no other source, because an email a visitor types is not verified and
accepting one would turn an order lookup into an oracle. It is added through the
plugin's own `busymate_ai_launch_claims` filter, never by editing the plugin.

#### The two ways the redirect half silently did nothing

Both were measured end to end on the live chat, and both leave the customer
signed in **for real** while the conversation that sent them stays a guest —
from their side indistinguishable from a broken sign-in, and from ours a green
`303` with a perfectly valid token in it.

1. **`return_to` was pinned to this store.** The hosted assistant page is not on
   this store: it is `fernweh.busymate.ai` (the canonical one — the workspace
   travels in the HOST, so a cold load there is still the Fernweh assistant) or
   `busymate.ai/support/fernweh`. Replacing that `return_to` with the shop's
   front page delivered the proof to a page nobody was waiting on. The guide is
   explicit — redirect to the **exact** `return_to` — so the fix is a short named
   allowlist, not a looser check.
2. **The nonce was minted, not echoed.** The platform puts a one-time
   `bmai_nonce` on the query string and the launch pair is BOUND to it. Signing
   our own produced a token the platform must refuse. `bmai_nonce` is now echoed
   whenever it is well-formed (`^[A-Za-z0-9_-]{32,200}$`) and only minted fresh
   for the direct full-page open, where nobody asked for a value.

Verified after both: clicking **Sign in** inside the chat at
`fernweh.busymate.ai` returns to the same conversation identified (the header
control flips from "Sign in to Fernweh Supply Co." to "Account"), and asking
where order 52 has got to is answered from the store's own order book.

### Two bugs in the generated plugin, found here

Both were measured on this store and both are silent, so they are written down:

1. **`https://busymate.ai/embed.js` 404s.** The loader is at
   `https://busymate.ai/embed/v1.js`. The widget simply never loaded.
2. **The plugin's `script_loader_tag` filter deleted its own identity bridge.**
   It rebuilds the `<script>` tag and returns it, discarding the `$tag` it was
   handed — and in this WordPress that `$tag` already contains the handle's
   inline "before" script, which IS the bridge. Measured:
   `wp_print_scripts("busymate-ai-embed")` emits 87 bytes with the filter and
   1442 without. The widget mounts either way, so a merchant sees it working
   while every signed-in customer is treated as a guest forever.

`fernweh-demo-experience.php` replaces the filter with one that ADDS the two
attributes to the tag it was given, and steps aside if the plugin is absent.

## The credentials, and where they are

Three files on the demo host, all `0600`, none in this repo (exact paths: ops
runbook `demos-hosting`):

| File | Holds |
|---|---|
| the env file | database passwords, the WordPress admin, the demo shopper's login |
| the REST-key file | the WooCommerce REST key pair the MCP server and the store connection use |
| the actor-verifier file | the HS256 verifier the platform's actor tokens are signed with, plus the (public) tenant, connector and audience it is scoped to |

The verifier's secret half is generated on the demo host; the same value is
installed on the connector through the platform, and neither side can read the
other's copy back.

## On the workspace

| | |
|---|---|
| tenant | `fernweh` — `7ce7ec4a-bced-465b-a4dd-d4fc2efc4677` |
| MCP connector | `cfb45545-87f7-4c58-a865-6136d76c38e5`, `signed_actor_token` |
| identity provider | `9c09d709-fb16-4d10-81b3-69317ce6d97c` |
| store connection | a `woocommerce` knowledge source over this shop's REST API |

Publishing REPLACES the config, so it always goes out whole:

```bash
node sites/_shared/knowledge/build-knowledge.mjs woo > /tmp/k.json   # or sites/woo/build.mjs
node sites/_shared/publish/build-publish.mjs woo /tmp/k.json > /tmp/publish.json
# then publish_tenant_runtime with /tmp/publish.json
```

**The published config is a zod `strictObject`, and it fails CLOSED and
SILENTLY.** One unknown key — `clockToleranceSeconds` where the field is
`clockSkewSeconds` — made the whole config unparseable, so the runtime read
returned null and every `/support/fernweh` render was the platform 404 while
`publish_tenant_runtime` kept answering `ok`. A parse failure is a null, not a
throw, so nothing was logged. If the assistant 404s after a publish that
succeeded, suspect a key name before anything else.

The catalogue is deliberately **not** in the published knowledge. The store
connection indexes the sixteen product pages off the shop's own REST API, cited
to their real permalinks, and the MCP tools answer a price or a stock count
live; publishing a copy as well would index the same fourteen products twice
against the tenant's budget and leave a copy to go stale.

`build-publish.mjs` takes the knowledge as a bare ARRAY. `sites/woo/build.mjs`
writes `knowledge.json` as `{ "knowledge_sources": [ … ] }`, so feeding that file
straight in publishes ONE source called `knowledge_sources` and reports
`undefined knowledge sources` on the way past. Unwrap it first.

## What the assistant is told, beyond its tools

`woo:asking-for-details` is the one knowledge source that is not about the shop.
The platform gives the agent its own `request_form` tool — that is where the
action card in the chat comes from, not from a tool's `formCard` — and left to
itself the model used it the way a nervous clerk uses a clipboard. All four
shapes were measured live:

| What happened | Why it is wrong |
|---|---|
| "Which order would you like to return from, and which item?" | a list of things to type, where the standard asks for a card |
| a card asking for an order number the customer had just typed | reads as not having listened |
| an EMPTY card while every answer was already on screen | worse than asking |
| "we'll email you a prepaid label" with no `start_return` behind it | a confirmation of something that did not happen |

So the knowledge draws three lines: a **missing** detail is asked for as a card,
a detail already **given** is never asked for again, and a filled-in form is
**arguments, not an outcome** — the return exists once `start_return` has come
back with an `RMA-` reference and not one sentence earlier. After publishing,
"Please open a return for the Quelle 750 on order 53" runs `start_return` behind
the confirm sheet and answers with the reference the shop really wrote onto the
order.

## Two things the theme does that are not obvious

- **Storefront FLOATS its main column.** The capability panel is a static
  sibling of that float inside `.col-full`, so without `clear:both` it began at
  the TOP of the float and painted its dark teal 3,864px straight through the
  product grid. Measured on the live shop: the panel box started at `y=320`
  while the shop content it follows ran to `y=1979`.
- **The shop commits to one look and now says so.** There is no
  `prefers-color-scheme` rule anywhere in Storefront, and no `color-scheme`
  declaration either, so a dark-mode browser force-darkened only the parts it
  owns — the sorting select, the quantity spinners — against a paper-white
  ground. `html{color-scheme:light}` ends that. The assistant is unaffected: it
  renders in a frame the platform owns and follows the theme of whoever is
  looking, which is how it is checked in both.
