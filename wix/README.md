# `wix` — Wren & Oat Bakery, a real Wix site

**Live site: <https://mrserebano.wixsite.com/wren-and-oat>** (free plan, HTTP 200, confirmed
live — `<title>HOME | Wren And Oat</title>`).

busymate-devtools#3012 — an invented artisan bakery, from a real Wix "Bakery" template (Cafe &
Bakery collection) via the classic Wix Editor (Home / Menu / Online Orders / About / Contact —
5 real pages, the free-tier equivalent of "5-6 pages").

**Wren & Oat Bakery is an invented business** — distinct from every other demo's brand
(Northwind/Northline/Marlow's/Nomad/Patchwell/Fernweh/Pixelforge/Bramble/Sol & Salt/Larkspur/
Meridian/Aldercroft). It is not a real bakery, takes no real orders.

## dev.wix.com — the 503 lifted, but only under Wix Studio

`scratchpad/saas-accounts/STATUS.md` (pass 4) recorded `dev.wix.com`/`wix.com/studio` as
503-ing site-side. Retried this pass: `dev.wix.com/apps/my-apps` now redirects cleanly to
`wix.com/intro/...?ref=app_studio_login`, which offers exactly one path forward —
"Switch to Wix Studio". Clicking it converts the ACCOUNT's dashboard chrome from classic
`manage.wix.com/account/websites` to `manage.wix.com/studio/*` (an agency/template-oriented
surface — "Custom Apps" there is a template/app browsing area, not a lightweight "register one
dev app" flow like Webflow's). The classic "Wix Editor" site-creation option is still selectable
underneath (used for this build), so the account switch did not force a Wix Studio SITE — only
a Wix Studio dashboard shell. The native App Market "Embedded Script" extension registration
(dev.wix.com → create app) was not reached — deprioritized once the free-tier embed's own
blocker (below) made the native path moot for now.

## Integration — both layers, honestly

- **Universal embed (HTML Embed element) — PLACED, does not render.** Added a real "Embed
  HTML" element to the Home page via Add Elements → Embed Code → Embed HTML, with
  `<script src="https://busymate.ai/embed/v1.js" data-assistant="wren-and-oat" async></script>`
  as its code, saved, published. Confirmed LIVE on the published page
  (`comp-mu2v56me`, a 230×190 `HtmlComponent`) but **the component never loads its iframe**:
  after full page load + hydration (`document.readyState === "complete"`) and scrolling it into
  view, `document.getElementById('comp-mu2v56me')` stays an EMPTY `<div>` and
  `performance.getEntriesByType('resource')` shows ZERO requests to `busymate.ai` or any
  html-iframe render endpoint — reproduced twice. Wix's OWN built-in chat widget on the same
  page (`comp-jr0p2ies`, `engage.wixapps.net/chat-widget-server`) DOES load, proving the page's
  lazy-component mechanism works in general — just not for this element on the free plan. This
  is the free-tier equivalent of the program brief's own flagged risk ("our loader inside a Wix
  iframe embed may not reach the host page") — here it doesn't even reach ITS OWN iframe. Not
  something a script-tag/URL fix can work around; would need a human confirming this in a real
  (non-automated) browser session, or Wix Premium (unlocks Settings → Custom Code, a
  page-level `<head>` injection instead of a boxed component).
- **Native path (App Market Embedded Script extension)** — not attempted (see above); the
  Wix Studio "Custom Apps" surface is the entry point whenever this is picked back up.

## Tenant/connector/identity-provider — real, MCP-verified; publish blocked by a platform bug

Provisioned via the owner MCP runner (`busymate.ai/mcp`, value-blind owner auth):
- Tenant `fd09cfb7-1058-42c5-8614-7bd181d66967`, slug `wren-and-oat` — real, `provision_tenant`.
- Identity provider `62b7bba0-c248-4461-b1a6-f5a417610b46` — real, `upsert_tenant_identity_provider`
  (issuer/jwks_uri/identity_endpoint_url all point at this backend). `test_tenant_identity_provider`
  reports config/jwks/launch_refusal all **passed**; only `publication` fails (`"the provider is
  not assigned to the current draft"` — a config-publish gap, not a provider defect).
- Connector `f77f6b17-f057-4d8f-a3ad-0ee1c70c58c9` — real, `upsert_tenant_connector`, LIVE-probed
  (`initialize` + `tools/list`, 7 tools found over the real `https://wix.demo.busymate.ai/mcp`).
  `delegation_mode: none` (so `who_is_signed_in` is honestly withheld from the assistant — offering
  it needs `signed_actor_token`/`oauth_per_user` wiring, a deeper feature than this pass reached).

**`publish_tenant_runtime` refuses: `preflight failed … unmet scenarios: origin-deny`.** Chased
precisely, not guessed at:
1. First suspected `settings.embed_origins` (`add_tenant_embed_origin`) — set it to
   `mrserebano.wixsite.com` + `wix.demo.busymate.ai` + the tenant's own `*.busymate.ai` origins.
   No change. Comparing against ghost's already-PUBLISHED tenant (`get_tenant_integration`)
   showed the real field the `origin-deny` scenario reads is `integration_config.access
   .allowed_origins` / `.channels.embed_origins` — a DIFFERENT, nested field only
   `set_tenant_config`/the Console's own save path can write; `settings.embed_origins` is unrelated.
2. Found and fixed a REAL bug along the way: this backend's `/api/identity/*` CORS
   `Access-Control-Allow-Origin` carried the full site URL (with the `/wren-and-oat` path) instead
   of a bare origin — invalid CORS, confirmed live, fixed (see git log; unlike webflow, whose real
   site origin IS its whole URL with no sub-path, so this split was never needed there).
3. `set_tenant_config` / `set_tenant_branding` via the MCP owner runner both refuse:
   `"native_action_unavailable"` — the exact same refusal the webflow lane hit and documented.
4. Tried the CONSOLE UI path instead (same mechanism ghost's operator likely used, since ghost's
   tenant successfully has `branding` set with no MCP-tool trace of it). Reproducibly, THREE
   Console pages throw a client-side render error for this tenant specifically:
   `/console/brand`, `/console/release`, `/console/access` — all "Something went wrong /
   Your mate hit an unexpected error", while `/console/overview` and `/console/integration`
   render fine for the SAME tenant, and `/console/release` renders fine for a DIFFERENT tenant
   (webflow's Aldercroft Studio, `183c2577-ea0d-4938-8d05-b58bf6d6c79b`) with the identical
   Console build (`v2.0.1 · 715`). This isolates the bug to something about a tenant provisioned
   via the bare `provision_tenant` MCP tool specifically (as opposed to however ghost's tenant
   was created) — a platform-side defect, not anything sites/wix/** controls.

**This is the precisely-named real external blocker this pass stops on**: both the write PATH
(`set_tenant_config`/`set_tenant_branding` MCP tools → `native_action_unavailable`) and the UI
PATH (`/console/brand`, `/console/release`, `/console/access` → client render error) to finish the
origin-allowlist config `origin-deny` needs are closed for this tenant. `wren-and-oat.busymate.ai/chat`
confirms the honest consequence: `"This Busymate address isn't set up yet."`

## The full-feature checklist, as built (honest)

| Capability | How | Status |
| --- | --- | --- |
| Real hosted site | `mrserebano.wixsite.com/wren-and-oat`, published, real Bakery template | **Live** |
| 5-6 pages | Home / Menu / Online Orders / About / Contact | **Live** (5) |
| Backend deployed | `demo-wix-backend-c` on the demo host, port 8119, ~14 MB RSS (cap 128m) | **Live** |
| MCP server | `https://wix.demo.busymate.ai/mcp` — `tools/list` returns 7 tools; `tools/call` verified for `list_menu`, `site_status` (live-fetches the real site, `ok:true`) | **Live** |
| Six-layer agent-ready files | `llms.txt`/`AGENTS.md`/`sitemap.md`/`index.md`/`agents.json`/`structured-data.json`/`healthz` all 200 on `wix.demo.busymate.ai` | **Live** |
| Grounded chat content | Curated `backend/wixContent.mjs` `FACTS` (menu/hours/story) — Wix's client-rendered warmup payload isn't cleanly regex-extractable the way Webflow's static export is; `site_status` proves real liveness (not a claim) | **Live** (backend side) |
| Identified sign-in | One provided demo customer, `jonah@wren-oat.demo.busymate.ai` (`backend/store.mjs`); identity provider registered + config/jwks/launch-refusal all verified | Built + provider verified; NOT publication-assigned (see blocker) |
| Universal embed | HTML Embed element placed + published on the live site | **Placed, does not render** (see blocker) |
| WebMCP page tools | Would register via the embed | **Not live** (embed doesn't render) |
| Native App Market path | Not attempted | **Not started** |
| Tenant | `fd09cfb7-1058-42c5-8614-7bd181d66967`, slug `wren-and-oat` | **Real**, provisioned |
| Connector | `f77f6b17-f057-4d8f-a3ad-0ee1c70c58c9`, live-probed | **Real**, probed |
| Identity provider | `62b7bba0-c248-4461-b1a6-f5a417610b46` | **Real**, verified except publication |
| Tenant published / hosted chat live | `publish_tenant_runtime` blocked | **Blocked** (platform bug, see above) |
| Docs + code links | `demo.json` → `docs`/`code` | Present, `docs` guide page pending |
| Public infra | `sites/wix/**`, this branch → `main` | Committed, mirror pending |

## Status (2026-09-15, honest)

Real and verified, independent of any Console bug: the Wix site is live and published (real
Bakery template, 5 pages); the backend is built AND DEPLOYED on the demo host with a working
MCP server (live-probed, `tools/call` verified against the real live site); the tenant, connector,
and identity provider are all real rows, not placeholders. `status` in `demo.json` stays `"beta"`
because the tenant is not published and the widget doesn't render — the two blockers above are
platform/free-tier limitations this lane could not close by itself, matching the webflow lane's
own precedent (`native_action_unavailable` blocking its onboarding too).

## Resuming this lane

Tracks `busymate-devtools#3012`. Exact devtools worktree/branch/checkout paths live in
the devtools private ops runbook — this file is the design, not the transcript.

Next steps, in order, once the platform Console-render bug is fixed (a separate `ai`-component
defect, not owned by this demo):
1. Set `integration_config.access.allowed_origins`/`channels.embed_origins` (via `/console/access`
   once it renders, or `set_tenant_config` once "native_action_unavailable" no longer applies) to
   include `https://mrserebano.wixsite.com` and `https://wix.demo.busymate.ai`.
2. `publish_tenant_runtime` again; confirm `wren-and-oat.busymate.ai/chat` goes live.
3. Have a human (not automation) open the published Wix page in a real browser and check whether
   the HTML Embed element loads on a genuine user visit — if it does, this was an automation-only
   artifact (bot-detection on the lazy-load trigger); if it still doesn't, escalate to Wix Premium
   Custom Code or the App Market native path as the real fix.
4. `scripts/mirror-public.sh`; devtools side (`ai` component): `demos.ts` DEMOS_FALLBACK +
   manifest, registryCatalog row, `content/docs/guides/wix.md` + i18n, verify `/demo/wix` +
   `/integrations/wix`.
5. Proof screenshot of the assistant working on the live Wix site; flip `status` to `"live"`
   only once genuinely true.
