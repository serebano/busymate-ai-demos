# `wordpress` — Larkspur Studio, a real WordPress business site

**Live: <https://wordpress.demo.busymate.ai>**

This is the playground's second **dynamic** demo (after `woo`) and the first that is
NOT a store: a genuine WordPress install for a services business — interior design and
renovation consulting — running the real, generic `busymate-ai` plugin (the same one
`woo` runs, generated per-tenant by `v2/apps/web/lib/commerce/wordpressPlugin.ts`,
#2842) plus a small demo-specific layer on top (busymate-devtools#2969, program #2899).

**Larkspur Studio is an invented brand** — a three-person interior-design and
renovation-consulting practice in Bristol. It is not a real company, takes no real
bookings and no real payment. Every photograph is a freely licensed Wikimedia Commons
file, credited in [`seed/IMAGE-CREDITS.md`](seed/IMAGE-CREDITS.md).

## Why this demo exists (distinct from `woo`)

`woo` already covers commerce. This demo shows the plugin on the 41%-of-the-web use
case: a business/content site — pages + a blog, no store — and demonstrates BOTH
plugin surfaces at once:

- the **floating widget** (every page, via `wp_enqueue_scripts`), and
- an **inline** chat surface via the `[bmai_assistant]` shortcode AND a Gutenberg
  block ("AI Assistant", `busymate-ai/assistant`) — placed inline on the Home,
  Services and Contact pages.

## The full-feature checklist, as built here

| Capability | How |
| --- | --- |
| Grounded chat | Knowledge published from the site's own About/Services/Contact/blog copy (`publish_tenant_runtime` `knowledge_sources`) |
| WebMCP page tools | `list_services`, `get_contact_info`, `who_is_signed_in`, `request_consultation` — registered client-side against `window.BusymateAI.registerPageTools` (same pattern as `woo`'s page tools) |
| An MCP server | [`backend/index.mjs`](backend/index.mjs) — a ~130-line, dependency-free Node server (`list_services`, `get_contact_info`, `search_content` over WordPress's own `/wp-json/wp/v2/` REST API, `request_consultation`), registered as the tenant's `larkspur` connector |
| Identified sign-in | The one provided demo customer, `jordan@wordpress.demo.busymate.ai` / see the box's `.env` — signs in via `/larkspur-demo-signin`, which mints the SAME ES256 launch proof the plugin's own `/wp-json/busymate/v1/launch` route mints and hands it back in the URL fragment |
| Hand-off to a person | The platform's own hand-off; say "I'd like to talk to someone" in the chat |
| Docs + code links | `demo.json` → `docs`/`code`, validated by `scripts/gen-manifest.sh` |

## How it differs from `woo`

| | `woo` | this one |
|---|---|---|
| Commerce | Yes (WooCommerce) | No — pages + blog only |
| Identity provider | The plugin + `fernweh-demo-experience.php` | The plugin + `larkspur-demo-experience.php` (same shape) |
| MCP server data source | WooCommerce Store/REST API | WordPress's own core `/wp-json/wp/v2/` REST API |
| Inline chat surface | Not demonstrated | `[bmai_assistant]` shortcode + Gutenberg block, shown on 3 pages |

`deploy.sh` skips this demo the same way it skips `woo` (`type == "dynamic"`).

## Recreating the site from scratch

Exact commands (paths, ports, access) live in the devtools private ops runbook
`demos-hosting` → "WordPress content demo — dynamic hosting recipe". In outline:

1. [`provision.sh`](provision.sh) — containers (WordPress + MariaDB, half the memory
   ceiling of `woo`'s since there is no WooCommerce), nginx vhost, Let's Encrypt cert.
   Reuses the SAME `infra/nginx/wordpress-{http,https}.conf.template` `woo` uses —
   both templates are already fully generic (parameterised by `__FQDN__`/`__PORT__`/
   `__MCP_PORT__`/`__ACME_ROOT__`), so nothing there needed changing.
2. `wp core install` + Neve theme (a real, popular free WordPress business theme —
   `wp theme install neve --activate`) + pages (Home, About, Services, Contact, Image
   credits) + three blog posts + a primary menu, all via `wp-cli`, content authored as
   real Gutenberg block markup (see the demo's live pages for the exact copy).
3. Generate the tenant's `busymate-ai` plugin with the product's OWN generator
   (`buildWordPressPlugin` in `v2/apps/web/lib/commerce/wordpressPlugin.ts`,
   tenantSlug `larkspur`) and install it — the SAME code path a real merchant's
   Console download uses, not a hand-written copy.
4. Install [`wp/mu-plugins/larkspur-demo-experience.php`](wp/mu-plugins/larkspur-demo-experience.php)
   as a must-use plugin — the demo-specific layer (shortcode/block, WebMCP tools, the
   one-click demo sign-in, and a REPAIR for a silent bug in the generated plugin,
   below).
5. Build + run [`backend/`](backend) (the MCP server) and register it with
   `upsert_tenant_connector`.
6. `upsert_tenant_identity_provider` pointing at this site's `/.well-known/jwks.json`
   + `/wp-json/busymate/v1/launch` + `/larkspur-demo-signin`, then
   `test_tenant_identity_provider` to prove it (config/JWKS/refusal/publication all
   green before calling it done).
7. `publish_tenant_runtime` with branding, `embed_origins`, and the knowledge sources.

## A repair for a bug in the generated plugin (found on `woo`, confirmed here)

`busymate-ai`'s own `bmai_script_loader_tag` filter REBUILDS the `<script>` tag from
scratch and returns it, discarding the `$tag` WordPress handed it — which already
carries the handle's inline "before" script, i.e. the identity bridge
(`window.BmaiWordPress` + `getIdentity`). Measured live on THIS site before the fix:
an empty `<script src=… data-assistant defer></script>` tag and no `BmaiWordPress`
global at all — the widget mounts either way, so it looks fine while every returning
signed-in visitor is silently treated as a guest. `larkspur-demo-experience.php`
applies the exact same fix `woo`'s `fernweh_embed_tag` does: replace the filter with
one that ADDS the two attributes to the tag it was GIVEN instead of rebuilding it.

## Hardening

Same posture as `woo`: `/wp-admin`, `/wp-login.php`, `/wp-signup.php`, `/wp-cron.php`,
`/xmlrpc.php` and any `.php` under `/wp-content/` all 404 publicly — administered only
through `docker exec … wp-cli`. `/larkspur-demo-signin` is the ONLY way in, and it can
only ever sign in the one named demo customer. `/wp-json/…` stays open (the point of
the demo); the front end is public.
