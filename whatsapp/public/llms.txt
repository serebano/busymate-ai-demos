# Marlow's Kitchen

> A neighborhood restaurant demo showing 'your mate' on WhatsApp: a live preview of the WhatsApp conversation, grounded chat, an MCP server over the restaurant's own menu/hours/table data, WebMCP in-page booking actions, and identified-visitor reservation lookup.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Marlow's Kitchen](https://whatsapp.demo.busymate.ai/)
- [The WhatsApp integration](https://busymate.ai/integrations/whatsapp)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://whatsapp.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `opening_hours` — Marlow's Kitchen's opening hours, by day of the week, including brunch/dinner service windows and any closed days.
- `list_menu` — List every dish and drink Marlow's Kitchen serves, grouped by section, with prices.
- `search_menu` — Search Marlow's Kitchen's menu by name, ingredient, or keyword (e.g. an allergen or 'vegetarian').
- `check_availability` — Check whether Marlow's Kitchen has a table for a given date, time and party size, with nearby alternative times if that exact slot is full.
- `book_table` — Do NOT call this tool to ask the visitor for date, time, party size, name or phone — call open_booking_form for that instead, it is the ONLY approved way to collect a missing field, never a chat question. Book a table at Marlow's Kitchen, but ONLY once the visitor has already stated every one of those five fields themselves, in their own words, earlier in this conversation. Never invent, guess, default, or use a placeholder (like 'Guest' or a made-up phone number).
- `get_my_reservations` — List the reservations at Marlow's Kitchen booked under a phone number. Requires an identified (signed-in) visitor — call it with that visitor's own phone number, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)
- `cancel_reservation` — Cancel a reservation at Marlow's Kitchen by its confirmation code + the phone number it was booked under. Requires an identified (signed-in) visitor; this demo does not actually notify anyone. (identified visitors only)
- `open_booking_form` — Open an inline booking form on the page for the visitor to fill in and submit themselves — name, phone, party size, date and time, one "Book table" button. Used instead of asking for those details one at a time in the conversation. (WebMCP page tool only, not on the MCP server)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Publish your page's actions (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Busymate AI for WhatsApp](https://busymate.ai/integrations/whatsapp)

## Optional
- [llms-full.txt](https://whatsapp.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://whatsapp.demo.busymate.ai/agents.json): the machine-readable card for this site
- [webmcp-catalog.json](https://whatsapp.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [sitemap.xml](https://whatsapp.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://whatsapp.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone
