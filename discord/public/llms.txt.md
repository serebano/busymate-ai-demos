# Pixelforge Games

> An indie game studio demo showing 'your mate' as a player-support desk in a Discord #support channel: a live preview of the channel conversation, grounded chat over three games and their public patch notes, an MCP server the studio owns, WebMCP page actions, a bug-report action card, and identified-player library and refund lookups.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Pixelforge Games](https://discord.demo.busymate.ai/)
- [The Discord integration](https://busymate.ai/integrations/discord)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://discord.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `list_games` — Every game Pixelforge Games has released — name, genre, price, the platforms it runs on, its current patch version and whether it is finished or still in early access.
- `search_patch_notes` — Search the public patch notes Pixelforge Games publishes, by keyword — a bug that was fixed, a feature that landed, a platform, a build number. Returns the matching entries with their version, date and the lines that mention it.
- `get_server_status` — Live status of the services Pixelforge Games runs for its players — cloud saves, the leaderboards, the key redemption service, the store and the studio's community server — plus any open incident.
- `report_bug` — Do NOT call this to ask the player which game, which platform, what happened or their email — calling it with whatever is already known IS how the bug form opens, never a chat question for a missing field. Files a bug report with Pixelforge Games and reports its id, the queue it landed in and what happens next. (MCP server only, not registered on the page)
- `get_my_purchases` — The games the signed-in player owns at Pixelforge Games, with the receipt, the purchase date, the price paid and the build they last played. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)
- `request_refund` — Start a refund on one of the signed-in player's own purchases at Pixelforge Games, by its receipt number. Requires an identified (signed-in) visitor and the player's explicit go-ahead first — say what will happen, then call it. This demo files the request but no money moves. (identified visitors only) (MCP server only, not registered on the page)
- `open_bug_report_form` — Open the bug-report form on the page itself for the player to fill in and send — game, platform, what happened and an email, with one "Send report" button. Use this when the player is looking at the page; pass anything already known (the game they named, the platform, what they described, a signed-in player's own email) as prefill so they only fill in what is missing. (WebMCP page tool only, not on the MCP server)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. A throwaway demo player is provided on the page, so the identified experience — a library, a receipt, a refund — can be tested without a real account.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Publish your page's actions (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Ask with a form card](https://busymate.ai/docs/guides/form-cards)
- [Busymate AI for Discord](https://busymate.ai/integrations/discord)

## Optional
- [llms-full.txt](https://discord.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://discord.demo.busymate.ai/agents.json): the machine-readable card for this site
- [webmcp-catalog.json](https://discord.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [sitemap.xml](https://discord.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://discord.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone
