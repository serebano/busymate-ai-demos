# `wix` — Wren & Oat Bakery, a real Wix site

**Live site: <https://mrserebano.wixsite.com/wren-and-oat>** (free plan, HTTP 200, confirmed
live — `<title>HOME | Wren And Oat</title>`).

busymate-devtools#3012 — an invented artisan bakery, from a real Wix "Bakery" template (Cafe &
Bakery collection) via the classic Wix Editor (Home / Menu / Online Orders / About / Contact —
5 real pages, the free-tier equivalent of "5-6 pages").

**Wren & Oat Bakery is an invented business** — distinct from every other demo's brand
(Northwind/Northline/Marlow's/Nomad/Patchwell/Fernweh/Pixelforge/Bramble/Sol & Salt/Larkspur/
Meridian/Aldercroft). It is not a real bakery, takes no real orders.

## Integration — every path on the free plan tried, honestly, in order

**Conclusion first: on Wix's free plan, there is no path this pass found that gets a
third-party embed widget to actually render on an already-published, real site.** Five
independent mechanisms were tried; each is either non-functional or explicitly plan-gated —
not a single missed script tag, a structural free-tier ceiling:

1. **Universal embed (HTML Embed element) — PLACED, does not render.** Added a real "Embed
   HTML" element to the Home page via Add Elements → Embed Code → Embed HTML, with
   `<script src="https://busymate.ai/embed/v1.js" data-assistant="wren-and-oat" async></script>`
   as its code, saved, published. Confirmed LIVE on the published page
   (`comp-mu2v56me`, a 230×190 `HtmlComponent`) but **the component never loads its iframe**:
   after full page load + hydration (`document.readyState === "complete"`) and scrolling it
   into view, `document.getElementById('comp-mu2v56me')` stays an EMPTY `<div>` and
   `performance.getEntriesByType('resource')` shows ZERO requests to `busymate.ai` — reproduced
   twice. Wix's OWN built-in chat widget on the same page (`comp-jr0p2ies`,
   `engage.wixapps.net/chat-widget-server`) DOES load, proving the page's lazy-component
   mechanism works in general — just not for this element on the free plan.
2. **Velo Dev Mode (`$w.onReady`, masterPage.js) — no DOM access, confirmed empirically.**
   Turned on Dev Mode for real, wrote `console.log('typeof document =', typeof document,
   'typeof window =', typeof window)` in `masterPage.js`, ran it in Preview, read the Developer
   Console: **`typeof document = undefined typeof window = undefined`.** Velo's page-code
   sandbox has no DOM access by design; `wix-window`/`wix-fetch` (the coordinator's suggested
   fallback) don't expose script injection either — confirmed, not assumed.
3. **Custom Element — explicitly Premium-gated, confirmed via the Editor's own banner.** Added
   a real Custom Element (`#customElement1`) via Add Elements → Embed Code → Custom Element
   (the one mechanism that, unlike the iframe HTML embed, runs un-sandboxed in the real page).
   The Editor shows, verbatim: **"Upgrade your site with a Premium plan to see this element
   live on your site."** Not a lazy-load quirk — a hard plan gate. Removed the element again
   (right-click → Delete) and re-published so the live site stays clean.
4. **Native App Market app (Embedded Script extension) — built, but installs only on a NEW
   throwaway dev site, never an existing one.** `dev.wix.com` retried: the account-level 503
   from `scratchpad/saas-accounts/STATUS.md` (pass 4) is gone, but `dev.wix.com/apps/my-apps`
   now redirects into Wix Studio's "Custom Apps" (a template gallery) rather than a dev-app
   list. Its own "Start With a Template" → "Self-managed" → "Start From Scratch" card, though,
   opens the REAL classic Wix Developers console at `manage.wix.com/apps/<id>/...` — a genuine
   self-managed app was created there: **"Busymate Demo Connector"**, App ID
   `f1f08ae4-ef71-4036-be06-1ff187f1427f`, with a real **Embedded Script** extension
   ("Busymate Chat Widget") carrying the same loader `<script>` + the tenant id. Then, both
   install entry points — the app's own "Test App → Test on dev site" AND the public
   "Share test link" (`https://wix.to/fFbmllh`) → "Test on Dev Site" — open the identical
   **"Select a development site"** modal, whose ONLY option is **"Create your first
   development site … Test on a free Premium dev site provided by Wix"**; searching it for
   "wren" returns "No site to show". Self-managed/unpublished custom apps on Wix can only be
   installed on a dedicated throwaway dev site Wix provisions for the purpose — never on an
   existing real site — confirmed via both entry points, not a guess.
5. **`document.head.appendChild` from a Custom Element's own script** would be the correct
   fix for (3) if the site were Premium — a Custom Element's backing JS (served here at
   `https://wix.demo.busymate.ai/custom-element.js`, a real `customElements.define()` that
   injects the loader) runs un-sandboxed, unlike Velo page code — but (3)'s plan gate makes
   this moot on free.

**Nothing here is a dead end from a missing script or a wrong URL** — every one of the five is
a genuine Wix platform/free-tier boundary, independently confirmed (a console log, an
"Upgrade to Premium" banner, a "No site to show" search, zero network requests after full
hydration). The one lever that would unblock this is a Wix Premium plan upgrade on the
account — a real recurring purchase decision, left to the owner rather than made unilaterally.

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
| Universal embed | 5 free-plan paths tried (HTML Embed, Velo DOM, Custom Element, native-app install, Custom Element script) | **All blocked** — free-tier ceiling, see above |
| WebMCP page tools | Would register via the embed | **Not live** (no embed path renders on free) |
| Native App Market app | "Busymate Demo Connector" (`f1f08ae4-ef71-4036-be06-1ff187f1427f`), Embedded Script extension built + test-link generated | **Built**, cannot install on this (non-dev) site |
| Tenant | `fd09cfb7-1058-42c5-8614-7bd181d66967`, slug `wren-and-oat` | **Real**, provisioned |
| Connector | `f77f6b17-f057-4d8f-a3ad-0ee1c70c58c9`, live-probed | **Real**, probed |
| Identity provider | `62b7bba0-c248-4461-b1a6-f5a417610b46` | **Real**, verified except publication |
| Tenant published / hosted chat live | `publish_tenant_runtime` blocked | **Blocked** (platform bug, see above) |
| Docs + code links | `demo.json` → `docs` (`busymate.ai/docs/guides/wix`, written for a real customer) / `code` | **Live** |
| Public infra | `sites/wix/**` mirrored to `serebano/busymate-ai-demos` | **Live**, verified (`raw.githubusercontent.com/.../wix/demo.json` 200) |

## Status (2026-09-15, honest)

Real and verified, independent of any Console bug: the Wix site is live and published (real
Bakery template, 5 pages); the backend is built AND DEPLOYED on the demo host with a working
MCP server (live-probed, `tools/call` verified against the real live site); the tenant, connector,
and identity provider are all real rows, not placeholders; the public mirror is live. `status` in
`demo.json` stays `"beta"` because two independent, fully-diagnosed blockers remain:
1. **Free-plan embed ceiling** (five paths tried, all blocked or Premium-gated — see above);
   the fix is either a human confirming a real (non-automated) browser visit changes anything
   for the HTML Embed lazy-load, or a Wix Premium upgrade (owner decision).
2. **Platform Console bug** blocking `publish_tenant_runtime` (busymate-devtools#3026, now with
   the platform-bugs lane).

Both match the webflow lane's own precedent (`native_action_unavailable` blocking its
onboarding too) — this is not unique to Wix.

## Resuming this lane

Tracks `busymate-devtools#3012`. Exact devtools worktree/branch/checkout paths live in
the devtools private ops runbook — this file is the design, not the transcript.

Next steps, in order:
1. Once busymate-devtools#3026 is fixed (platform-bugs lane): set
   `integration_config.access.allowed_origins`/`channels.embed_origins` (via `/console/access`
   once it renders, or `set_tenant_config` once "native_action_unavailable" no longer applies) to
   include `https://mrserebano.wixsite.com` and `https://wix.demo.busymate.ai`; `publish_tenant_runtime`
   again; confirm `wren-and-oat.busymate.ai/chat` goes live.
2. Have a human (not automation) open the published Wix page in a real browser and check whether
   the HTML Embed element loads on a genuine user visit — if it does, this was an automation-only
   artifact (bot-detection on the lazy-load trigger); if it still doesn't, this confirms the
   five-path finding above and the real fix is a Wix Premium upgrade (unlocks Custom Code AND
   the Custom Element) — an owner decision, not something to do unilaterally.
3. If Premium is approved: Settings → Custom Code, paste the loader script (site-wide, every
   page) — the simplest of the five paths once the plan gate is gone; OR re-add the Custom
   Element (Add Elements → Embed Code → Custom Element → Choose Source →
   `https://wix.demo.busymate.ai/custom-element.js`, tag `busymate-widget`) and confirm the
   "Upgrade to Premium" banner is gone.
4. Once real: WebMCP page tools (menu, order status) generated from `backend/tools.mjs`'s
   table, registered on whichever surface can actually run script (the Custom Element's real
   page context, not the sandboxed HTML Embed iframe); CTA auto-submit via the shared
   `open-chat.js` pattern; a proof screenshot of the assistant open on the live Wix site; flip
   `status` to `"live"` only once genuinely true.
5. Devtools side (`ai` component, done this pass): `demos.ts` DEMOS_FALLBACK (status
   `"coming-soon"`, honest) + `registryCatalog.ts` row (status `"beta"`, points at the real
   guide) + `content/docs/guides/wix.md` + `lib/docs/guides.ts` + i18n seed — flip demos.ts to
   `"live"` alongside step 4, not before.
