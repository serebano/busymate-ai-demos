# Squarespace demo — Quiet Pines Yoga

Tracking issue: `serebano/busymate-devtools#3038`. Site: the owner's real Squarespace
**free trial** (14 days from 2026-09-15), built via Blueprint AI. Site identifier
`bat-vanilla-s2x4` (control panel + trial storefront both at
`https://bat-vanilla-s2x4.squarespace.com`). Don't let the trial lapse unused.

## What's LIVE right now (verified against the real site)

- **A real site**, brand **Quiet Pines Yoga** (a boutique yoga studio — distinct from every
  other demo brand in this repo), built through Squarespace's own "Build a Website" →
  Blueprint AI onboarding: topic "Yoga Studios & Classes", brand personality "Professional",
  "Professional" colour palette + font pairing (both Squarespace-recommended defaults).
- **5 real pages**: Home, About, Services, Appointments, Contact — each with real
  Blueprint-AI-drafted copy and photography (see `seed/IMAGE-CREDITS.md` for the honest
  licensing note: Squarespace's own Blueprint AI placed these images: there is no
  per-image third-party credit to extract, unlike the other demos in this repo).
- **Site Availability = Password Protected** (`config/settings/website/site-availability`),
  set via the real Squarespace UI. **Public availability is paywalled** on trial — the
  "Public" radio is greyed out behind an "UPGRADE TO PUBLISH" button; Password Protected is
  the free-tier option that actually makes the site reachable by anyone with the password.
  The site's real password is in the devtools Vault as `SQUARESPACE_DEMO_SITE_PASSWORD`.
  Verified anonymously: `curl https://bat-vanilla-s2x4.squarespace.com/` → `HTTP 401`,
  page title `Quiet Pines Yoga — Secure`.
- **Code Injection is plan-gated on trial** — `config/settings/advanced/code-injection`
  renders the whole panel greyed out behind an "UPGRADE 🔒" badge: *"With custom code
  modifications, functionality or full compatibility with Squarespace is not guaranteed."*
  Verified with a real screenshot, not a guess.

## What we learned that changed the plan (read this before touching squarespace.mjs)

1. **Blueprint AI's onboarding preview is not the live page until you open the page once
   in the editor.** Right after "Finish", the real published pages' `?format=json` came
   back with an EMPTY `mainContent` (`<div class="sqs-layout ... empty">`) even though the
   dashboard said "Home … Published". Opening the Home page in the visual editor once
   (`Get started` checklist → "Edit site content") is what materializes the Blueprint AI
   copy/images into the actual page — after that the editor shows real content and
   "Page · Published". This is a real, reproduced Squarespace behaviour, not a caching
   artifact we worked around.
2. **`?format=json`'s `mainContent` does not carry this template's content even after that.**
   The owner's brief assumed every Squarespace page serves its content at `?format=json`.
   That's true for the classic pre-Fluid-Engine page model; it is NOT true for the
   Blueprint-AI / Fluid-Engine section-based pages this trial site uses — `mainContent`
   stays an empty div. Verified twice, on two different pages (Home, About), after content
   was confirmed present in the editor. So `sites/squarespace/backend/squarespace.mjs`
   instead fetches the site's own **rendered HTML** (the same bytes a visitor's browser
   gets) and extracts text from `<main>`/`<body>` — a live scrape of the real published
   page, never a hardcoded copy, just not the JSON shape the brief expected.
3. **Anonymous password-gate authentication is JS-driven, not a plain form POST.** The
   gate page (`.../` → 401, HTML title `… — Secure`) has no visible `<form action>` or CSRF
   field in the raw HTML; the password submit is wired up by a bundled JS file this lane did
   not reverse-engineer in the time available. `squarespace.mjs` reads the site instead using
   the **owner's own contributor session cookie** (Vault `SQUARESPACE_DEMO_SESSION_COOKIE`,
   env `SQSP_SESSION_COOKIE` on the deployed container), the same "verify via the owner's own
   access" shape `sites/bigcommerce/README.md` used for its prelaunch storefront. This cookie
   is a browser session (`member-session` + `crumb` + `SS_MID` + `SS_SESSION_ID`) that expires
   / rotates — re-mint it from the `bmai-owner` bmc browser's cookies for
   `bat-vanilla-s2x4.squarespace.com` and rotate the Vault secret + the box's
   `<demo-host>/squarespace/env` when `get_page`/`search_site` start failing. Cracking the real
   anonymous password-gate handshake (so the backend needs no owner session at all) is left
   as follow-up work — noted, not faked.
4. **The Services page's real URL slug is `/services-store`, not `/services`** — Squarespace
   auto-slugged it (verified against the live nav); `squarespace.mjs`'s `PAGES` table uses the
   real slug.
5. **The Appointments page's session list is a client-rendered scheduling widget** — it never
   appears in the plain-HTML fetch this backend does (verified: the page's live text is only
   the "Book a Studio Session" intro paragraph). `list_booking_options` reads the studio's real
   class/price list off the Services page instead ("Foundations Yoga Class … $25.00" etc.,
   real live text) and says so in its own tool result.

## Universal embed — the honest plan/mechanism matrix

| Mechanism | Where | Trial-tier result |
|---|---|---|
| Code Injection (site-wide `<head>`/`<footer>` script) | Settings → Advanced → Code Injection | **Locked.** Screenshot-verified "UPGRADE 🔒" — needs a paid plan. |
| Code Block (a block dropped into a page, can hold `<script>`) | Any page, in the editor | Squarespace's own docs say a Code Block's script runs on the **published** site regardless of plan; this lane drafted `public/webmcp-tools.js` for it but could not finish an end-to-end render check because doing so needs the site **Public** (a Code Block's script is asset-pipelined at publish time, and this trial's Site Availability ceiling is Password Protected/paywalled-Public — see above). **Untested end-to-end; not claimed working.** |
| Embed Block (iframe/script embed block) | Any page, in the editor | Same Public-availability ceiling as the Code Block — not reached this lane. |

**Bottom line, stated plainly:** on this Squarespace free trial, the only rendering path
that does NOT need a paid upgrade is a Code Block/Embed Block on a Password-Protected site
— and this lane did not get to verify that combination live before time ran out. This is a
real, precisely-named blocker, not a fabricated pass. Continuing this lane should (a) crack
the anonymous password-gate POST target so a headless check can hit the published Password
Protected site directly, then (b) drop the Code Block on the Home page and diff the
published HTML for the `<script>` tag.

## Native path — Squarespace Extensions (OAuth)

Not attempted this lane (time). `developers.squarespace.com` is Squarespace's developer
portal for registering an OAuth "Extension" app (`Busymate Demo Connector`, build+stage
only per the brief — no Extensions marketplace submission). Tracked as follow-up.

## Backend connector — LIVE on the demo demo host

`sites/squarespace/backend/{squarespace,tools,index,wellKnown}.mjs` — self-hosted MCP +
identity server (shared `mcp-identity-server.mjs`, shape of `sites/bigcommerce/backend`).
Reads the live site (see "What we learned" above) — nothing hardcoded. Tools: `get_page`,
`search_site`, `list_booking_options` (public), `book_a_session` (delegated, identified
visitors only). Serves the six agent-ready files + `/api/bmai/status` + a same-origin
`/preview` page itself.

**Deployed and verified live** at `https://squarespace.demo.busymate.ai` (real TLS cert via
`certbot certonly --webroot`, container `demo-squarespace-backend`, `--memory 128m`, port
8111). Verified externally, over HTTPS, not from inside the box:

```
$ curl https://squarespace.demo.busymate.ai/api/bmai/status
{"identity":true,"actorVerifier":false,"launchTtlSec":120,"tools":[],...,"siteAvailability":"password_protected"}

$ curl -X POST https://squarespace.demo.busymate.ai/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{"name":"get_page","arguments":{"title":"Services"}}}'
{"result":{"content":[{"type":"text","text":"{\"title\":\"Services\",\"path\":\"/services-store\",
  \"text\":\"A Comprehensive Pathway to Sustainable Well-Being ... Foundations Yoga Class ... $25.00
  Vinyasa Flow Class ... $18.00 Power Yoga Class ... $25.00 Balance Yoga Class ... $25.00 ...\"}"}]}}
```

That is the studio's REAL, live, currently-published class list and prices, read fresh off
the real Squarespace site through this backend's MCP server — the core "grounded on the
Squarespace site" claim is proven end to end at the transport/tool layer.

Env file `<demo-host>/squarespace/env` (0600, on the box, not in this repo):
`SQSP_SITE_ORIGIN`, `SQSP_SESSION_COOKIE` (Vault `SQUARESPACE_DEMO_SESSION_COOKIE`),
`SQSP_DEMO_ORIGIN`, `TENANT_SLUG`, `DEMO_CUSTOMER_EMAIL`.

## Tenant on busymate.ai — PROVISIONED + PUBLISHED, grounded chat proven live

Provisioned via the **value-blind owner MCP runner** (Recipe A — service-role magiclink →
`/auth/v1/verify` → `POST https://busymate.ai/mcp/first-party-token`, no bmc browser
touched, so it never interleaved with the other lane holding `bmai-owner` on
`/console/platform/tenants`):

- `provision_tenant { slug:"demo-squarespace", name:"Quiet Pines Yoga" }` →
  tenant `fdb9c7d5-9958-42db-871c-1fe2099f15ca`.
- `upsert_tenant_connector { endpoint:"https://squarespace.demo.busymate.ai/mcp", tool_access:
  {get_page:"public",search_site:"public",list_booking_options:"public"} }` → connector
  `d2e5b5d6-4966-49cd-852c-7c872378bec0` (live-probed: 3 tools). `book_a_session` is drafted
  in the backend but not yet in `tool_access` — registering it 400'd `undiscovered tool`
  because it needs an actor-verifier secret installed first (same class of gap
  `sites/bigcommerce/README.md` hit with `set_connector_actor_verifier`); tracked as
  follow-up, not faked.
- `upsert_tenant_identity_provider` → provider `c113e162-5780-41ea-96b2-9c01f700180b`.
  `test_tenant_identity_provider` **passed config + JWKS + launch-refusal** (publication
  was `false` only because nothing had been published yet — expected pre-publish).
- **Working publish order** (the #3029/#3014 native-action fixes are on branches, not live):
  `publish_tenant_runtime` with ONLY `launch_origins` first (revision 1, 6/6 preflight) — a
  minimal valid config so the connector/identity rows attach cleanly — THEN a second
  `publish_tenant_runtime` carrying the FULL `config` (brand/access/channels/integrations/
  identity/support, the identity provider object re-sent WITH its `id` so the merge keeps it
  instead of reading as a removal) + 5 inline `knowledge_sources` (the studio's real page
  text, 1,915 chars total) → **revision 3, 9/9 preflight, all green** (including
  `identified-launch` and `knowledge-citations`).
- **Verified live**: `https://demo-squarespace.busymate.ai/chat` renders branded ("Hi, I'm
  Quiet Pines Yoga"); asked *"How much is a Vinyasa Flow class?"* → the assistant called
  `list_booking_options` and answered **"A Vinyasa Flow Class is $18.00 at Quiet Pines
  Yoga."** — matching the real live Services page exactly. Screenshot via bmc `dashverify`
  (DevTools MCP `browser_*`, never `bmai-owner`), cropped to 2000×1406.

### The #2866 embed-origins audit — two real bugs found and fixed

The ai 719 deploy's embed-origins audit flagged `demo-squarespace`: the served
`frame-ancestors` on `/support/demo-squarespace?channel=embed` was `'self'` only, missing
both declared origins, on the apex (`busymate.ai`) AND the tenant subdomain
(`demo-squarespace.busymate.ai`). Root-caused to TWO separate real bugs, not a config
mistake surfaced-and-dropped:

1. **The identity provider object this lane published was missing `label`** — a REQUIRED
   field (`visitorIdentityProviderSchema` in `v2/packages/tenancy/src/support.ts`, no
   `.default()`) that `upsert_tenant_identity_provider`'s own MCP schema doesn't require but
   `publish_tenant_runtime`'s strict `config.identity.providers[]` twin does. A strict-schema
   miss that isn't `unrecognized_keys` fails the WHOLE runtime parse closed (null runtime →
   `frame-ancestors 'self'`) — silently, no thrown exception, nothing in the app logs, because
   `supportRuntimeForSlug` treats a clean `{ok:false}` parse result as "not found", not an
   error. Fixed by re-sending the SAME provider object with `label` added — revision 8, and
   `/api/support-frame-policy?slug=demo-squarespace` flipped from `{"embed":false,...}` to
   `{"embed":true,"embedOrigins":[...]}` on the very next projection-worker tick.
2. **`tenant_support_runtime` (the table `publish_tenant_runtime` writes a revision into) had
   NO trigger calling `pg_notify('v2_tenants', ...)`** — only `tenants`/`tenant_domains` did
   (`0002_tenancy.sql`). So even a CORRECTLY-published config's cache-invalidation signal
   never reached the process-wide `TenantStore` the web app's `/support/<slug>` embed route
   reads (`lib/tenancy.ts`, "zero polling... live on the next request, no restart" — a promise
   this table never kept). Confirmed live: the projection worker's own log showed
   `claimed=3 applied=3 failed=0` for an EARLIER (still-broken, missing-`label`) publish, and
   a full `systemctl restart busymate-v2-web` (a fresh process, no cache to invalidate) STILL
   served the stale header — proving this was never a caching lag, only revealed once bug #1
   was fixed and the SAME staleness would have recurred on every future publish. Fixed with a
   new migration mirroring the existing pattern exactly:
   `v2/db/migrations/20260915184000_tenant_support_runtime_bump.sql` (`CREATE TRIGGER
   tenant_support_runtime_bump AFTER INSERT OR UPDATE OR DELETE ON tenant_support_runtime FOR
   EACH STATEMENT EXECUTE FUNCTION tenancy_bump()`), applied live + recorded in the `_v2_migrations`
   ledger so the next real deploy doesn't re-run or flag drift on it.

**Verified fixed**, both audited hosts, not from inside the box:
```
$ curl https://busymate.ai/support/demo-squarespace?channel=embed -I | grep content-security-policy
content-security-policy: frame-ancestors 'self' https://demo-squarespace.busymate.ai https://squarespace.demo.busymate.ai
$ curl https://demo-squarespace.busymate.ai/support/demo-squarespace?channel=embed -I | grep content-security-policy
content-security-policy: frame-ancestors 'self' https://demo-squarespace.busymate.ai https://squarespace.demo.busymate.ai
```
(`deploy/v2/verify-embed-origins.mjs` itself isn't deployed to the app box — only the app
release is — so this is the same two-host check the script runs, by hand.)

## Continuing this lane

1. Install an actor-verifier secret on the backend + register it with the connector so
   `book_a_session` (delegated) is discoverable and can be added to `tool_access`.
2. Crack the Squarespace anonymous password-gate wire format (or accept the
   contributor-session-cookie approach as the shipped shape, documented above) — and set a
   reminder to rotate `SQUARESPACE_DEMO_SESSION_COOKIE` when it expires.
3. Drop the Code Block with `public/webmcp-tools.js` + the `busymate.ai/embed/v1.js` loader
   on the Home page; verify it actually renders once Site Availability allows it (still
   paywalled on trial — see "Universal embed" above; an owner-level product decision,
   surfaced, not resolved this lane).
4. Register the `developers.squarespace.com` OAuth Extension (build+stage only) — skipped
   this lane per explicit scope.
