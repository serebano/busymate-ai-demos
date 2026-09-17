# Email channel — Harbor & Vale Travel

The email-channel demo of [Busymate AI](https://busymate.ai): a small travel agency whose support is
email-first. A customer's mail to the agency's connected mailbox becomes a conversation; your mate
answers **in the same thread, from that mailbox**, proposes a consultation slot and sends a calendar
invitation; a teammate can take the thread over from the Inbox, where the mail copilot summarizes,
drafts, translates, forwards and sends.

**Status: scaffold (coming soon).** The brand, the knowledge and the page are here; the live loop
needs the demo tenant's own mailbox connected through the Console's hosted sign-in
(`Console → Email → Connect a mailbox`, tracked in
[busymate-devtools#3198](https://github.com/serebano/busymate-devtools/issues/3198)). It flips to
`live` — here in `demo.json` **and** on the product site's demo card — in the change that proves a
real inbound mail answered threaded.

| | |
|---|---|
| Live site | `email.demo.busymate.ai` (coming soon) |
| How to integrate | [busymate.ai/docs/guides/email](https://busymate.ai/docs/guides/email) |
| Integration page | [busymate.ai/integrations/email](https://busymate.ai/integrations/email) |

## What the page shows

- An **inbox-style preview**: a booking enquiry arriving by mail, the assistant's threaded reply,
  quoted history folded away, and a `.ics` invitation for the consultation call.
- The **operator's view**: the same thread in the Inbox with the copilot row — AI draft, Summarize,
  Translate, Forward, Invite, Send.
- The **website widget** with the same assistant and the same tools, for a visitor who would rather
  chat than write.

## Files

- `demo.json` — the manifest row (`status`, `order`, `icon`, links; `tenant_id` once provisioned).
- `brand.json` — the invented brand, the assistant's name (Marin) and voice.
- `knowledge.json` — the grounding facts (about the demo, how the agency works, policies).
- `publish.json` — suggestions and the connected-mailbox note (no secret lives here).
- `public/` — the static site; `_shared/` is reused from the repo root at build time.

No real company's assets or real person's likeness is used; every photograph, when added, is credited
in `IMAGE-CREDITS.md`.
