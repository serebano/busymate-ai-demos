# AGENTS.md

## Project overview
Pixelforge Games — An indie game studio demo showing 'your mate' as a player-support desk in a Discord #support channel: a live preview of the channel conversation, grounded chat over three games and their public patch notes, an MCP server the studio owns, WebMCP page actions, a bug-report action card, and identified-player library and refund lookups.

## How an agent should read this site
Start at [llms.txt](https://discord.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://discord.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://discord.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://discord.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://discord.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://discord.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://discord.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). Per-tool access (public vs. identified-visitors-only, read-only vs.
confirmation-required) is declared in [.well-known/agent-permissions.json](https://discord.demo.busymate.ai/.well-known/agent-permissions.json) — treat a tool NOT listed there as denied.

## Usage & examples
Call this site's MCP server at `https://discord.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `list_games` — Every game Pixelforge Games has released — name, genre, price, the platforms it runs on, its current patch version and whether it is finished or still in early access.
- `search_patch_notes` — Search the public patch notes Pixelforge Games publishes, by keyword — a bug that was fixed, a feature that landed, a platform, a build number. Returns the matching entries with their version, date and the lines that mention it.
- `get_server_status` — Live status of the services Pixelforge Games runs for its players — cloud saves, the leaderboards, the key redemption service, the store and the studio's community server — plus any open incident.
- `report_bug` — Do NOT call this to ask the player which game, which platform, what happened or their email — calling it with whatever is already known IS how the bug form opens, never a chat question for a missing field. Files a bug report with Pixelforge Games and reports its id, the queue it landed in and what happens next. (MCP server only, not registered on the page)
- `get_my_purchases` — The games the signed-in player owns at Pixelforge Games, with the receipt, the purchase date, the price paid and the build they last played. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)
- `request_refund` — Start a refund on one of the signed-in player's own purchases at Pixelforge Games, by its receipt number. Requires an identified (signed-in) visitor and the player's explicit go-ahead first — say what will happen, then call it. This demo files the request but no money moves. (identified visitors only) (MCP server only, not registered on the page)
- `open_bug_report_form` — Open the bug-report form on the page itself for the player to fill in and send — game, platform, what happened and an email, with one "Send report" button. Use this when the player is looking at the page; pass anything already known (the game they named, the platform, what they described, a signed-in player's own email) as prefill so they only fill in what is missing. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. A throwaway demo player is provided on the page, so the identified experience — a library, a receipt, a refund — can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
