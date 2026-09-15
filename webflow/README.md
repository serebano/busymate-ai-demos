# `webflow` — Aldercroft Studio, a real Webflow site

**Live site: <https://aldercroft-studio.webflow.io>** (free Starter plan — no custom domain; see
"Status" below for what is and isn't live yet).

The playground's Webflow demo (busymate-devtools#2997) — an invented architecture and design
studio, from the free "Homura — Architecture & Design" Webflow template
(<https://webflow.com/templates/html/homura-website-template>).

**Aldercroft Studio is an invented business** — distinct from every other demo's brand
(Northwind/Northline/Marlow's/Nomad/Patchwell/Fernweh/Pixelforge/Bramble/Sol & Salt/Larkspur/
Meridian). It is not a real studio, takes no real consultations. The Homura template ships one
real page with in-page anchor sections (Home/About/Properties/Services/Testimonials/FAQ/Contact) —
the free Starter plan caps total pages at what shipped with the template, so this is the
free-tier equivalent of "5-6 pages", per the program brief's own "use the free alternative, note
it" instruction rather than upgrading the plan.

## Why this demo exists (distinct from `ghost`/`wordpress`/`woo`)

Webflow has no plugin runtime and, on the free Starter plan, no Custom Code injection at all
(that feature is paid-plan-gated, both at Site Settings AND per-page). The two integration
layers, honestly:

- **Universal embed (custom code) — NOT live.** Both custom-code surfaces refuse on Starter
  ("To unlock custom code, add a site plan to this site"). The documented free-tier fallback —
  drop a `Code Embed` element on the canvas by hand — needs Webflow's real HTML5 drag-and-drop,
  which this program's browser-automation tooling cannot synthesize (`Input.dispatchMouseEvent`
  produces no drop; `Input.dispatchDragEvent` needs a bidirectional CDP event subscription the
  available tool doesn't provide). A human doing that ONE drag (~30 seconds, in the Designer)
  would make this live exactly the way any customer does it today.
- **Native path — the `busymate-demo-connector` Designer Extension — installed, not verified
  working.** [`extension/`](extension) is a real TypeScript Designer Extension
  (`@webflow/designer-extension-typings@2.0.2`): its one button inserts an `HtmlEmbed` element
  carrying the loader `<script>` via `webflow.elementPresets.HtmlEmbed` + `setSettings` (falling
  back to a plain "Chat with us" link to the hosted chat if that's refused). It typechecks and
  lints clean, and it's genuinely installed on this site (Workspace apps → Install → a real
  OAuth-style authorize scoped to this site only) and launches inside the Designer (a correctly
  sized/positioned `240×360` dev-app iframe with the right `src`). **What's unverified:** the
  panel renders blank in every screenshot taken so far — diagnosed as far as possible without a
  human in front of the real screen (see the devtools-side journal, `notes/journal/ai.md`,
  entries for #2997) — so whether the insert actually works is not yet known either way.

## The full-feature checklist, as built (and as NOT yet true)

| Capability | How | Status |
| --- | --- | --- |
| Real hosted site | `aldercroft-studio.webflow.io`, published | **Live** |
| Grounded chat | MCP tools read the site's own live published HTML (`backend/webflowContent.mjs`) — never a second copy | Backend built; not reachable by a visitor without the embed |
| WebMCP page tools | Would register via the same blocked embed/extension path | **Not live** (blocked, see above) |
| An MCP server | [`backend/index.mjs`](backend/index.mjs) — the shared `sites/_shared/backend/mcp-identity-server.mjs`, fed this demo's tools (`backend/tools.mjs`) | Built, not deployed to the demo host yet |
| Identified sign-in | One provided demo client, `priya@aldercroft.demo.busymate.ai` (`backend/store.mjs`) — Webflow Memberships is a paid-plan feature, unavailable on Starter, so this signs in through the shared server's own demo-signin the same way `scan`/`ghost` do | Built, not deployed |
| Six-layer agent-ready files | Served by this backend (`backend/wellKnown.mjs`), not by Webflow — Starter can't host a custom path | Built, not deployed |
| Tenant | Real: `tenant_id=183c2577-ea0d-4938-8d05-b58bf6d6c79b`, slug `aldercroft-studio`, created via the platform's own onboarding wizard (Provision step: **Done**) | **Blocked mid-onboarding** — the wizard's "Apply branding" step fails with `set_tenant_branding refused: native_action_unavailable` and blocks the downstream Add-custom-domain / Home-client-admin / Publish-runtime steps. This is a platform-side gap, not a Webflow-side one; retrying the step reproduces the same failure. |
| Connector / identity provider | Not created — blocked by the tenant onboarding above | **Not live** |
| Docs + code links | `demo.json` → `docs`/`code` | Present, `docs` guide page not written yet |

## Status (2026-09-15, honest)

Real and verified: the Webflow site is live and published; the Designer Extension is coded,
typechecked, and installed on the site; the backend (MCP + identity + six-layer files) is coded
and passes no build step (dependency-free, matches the other demos' backends).

Not yet true, named precisely rather than glossed over:
1. Nothing is reachable by an actual visitor yet — no working embed, so no live chat widget on
   the published site.
2. The tenant is provisioned but not published (platform onboarding blocked on branding).
3. The backend container isn't deployed to the demo host yet.
4. `status` in `demo.json` stays `"beta"` until 1-3 are resolved for real — never flipped to
   `"live"` on the strength of code existing.

## Recreating the site from scratch

1. Webflow dashboard → New Project → Template → Architecture & Design → "Homura" (free) →
   site name "Aldercroft Studio" → creates `aldercroft-studio.webflow.io`.
2. Publish (Designer → Publish → Staging).
3. `extension/`: `npm install && npm run build` inside the extension, then `webflow extension
   bundle` to produce the real upload artifact for the registered "Busymate Demo Connector" app
   (Workspace → Apps & Integrations → Develop) — this repo currently ships the DEV-mode source
   only (`webflow extension serve`), not a bundled/published version, since installs are
   build+stage only per the program's HARD constraint (no marketplace submission).
4. Backend: `docker build -f sites/webflow/backend/Dockerfile .` from the repo root (needs
   `sites/_shared/backend/*.mjs` alongside it, same as every other dynamic demo).
5. Tenant: Console → Platform → Add client → slug `aldercroft-studio` (see "Status" above for
   where onboarding currently stops).
