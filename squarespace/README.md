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
   the **owner's own contributor session cookie** (refreshed into the Vault as
   `SQSP_SESSION_COOKIE`), the same "verify via the owner's own access" shape
   `sites/bigcommerce/README.md` used for its prelaunch storefront. Cracking the real
   anonymous password-gate handshake (so the backend needs no owner session at all) is left
   as follow-up work — noted, not faked.

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

## Backend connector (built, not yet deployed)

`sites/squarespace/backend/{squarespace,tools,index,wellKnown}.mjs` — self-hosted MCP +
identity server (shared `mcp-identity-server.mjs`, shape of `sites/bigcommerce/backend`).
Reads the live site (see "What we learned" #2/#3 above) — nothing hardcoded. Tools:
`get_page`, `search_site`, `list_booking_options` (public), `book_a_session` (delegated,
identified visitors only). Serves the six agent-ready files + `/api/bmai/status` + a
same-origin `/preview` page itself.

**Not yet deployed to the demo demo host** — this lane wrote and committed the code but did
not SSH to the box to build the image, mint the ES256 keypair, or front it with
`squarespace.demo.busymate.ai` (real TLS). Continuing this lane: follow the exact deploy
shape in `sites/bigcommerce/README.md` ("Continuing this lane" — Vault-sourced env,
`docker build`/`run`, DNS + reverse-proxy for the new subdomain, port 8111 to avoid the
bigcommerce backend's 8110).

## Tenant on busymate.ai — NOT provisioned

Deliberately not started: provisioning a tenant + MCP connector that points at a backend
origin (`squarespace.demo.busymate.ai`) that doesn't exist yet would create a broken,
misleading tenant. Do this AFTER the backend above is deployed and its `/mcp` + `/.well-known/
jwks.json` answer for real, following the BigCommerce/Webflow/Wix lanes' TENANT notes
(publish-first-with-minimal-config, then set config, then re-publish) if the same
`native_action_unavailable` platform bugs are still live.

## Continuing this lane

1. Deploy the backend (above), get `squarespace.demo.busymate.ai` answering.
2. Crack the Squarespace anonymous password-gate wire format (or accept the
   contributor-session-cookie approach as the shipped shape, documented above).
3. Drop the Code Block with `public/webmcp-tools.js` + the `busymate.ai/embed/v1.js` loader
   on the Home page; verify it actually renders once Site Availability allows it.
4. Register the `developers.squarespace.com` OAuth Extension (build+stage only).
5. Provision the busymate.ai tenant + connector once #1 is real.
6. Real screenshot: the assistant answering grounded on the live site (widget open).
