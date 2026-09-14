# AGENTS.md

## Project overview
Marlow's Kitchen — A neighborhood restaurant demo showing 'your mate' on WhatsApp: a live preview of the WhatsApp conversation, grounded chat, an MCP server over the restaurant's own menu/hours/table data, WebMCP in-page booking actions, and identified-visitor reservation lookup.

## How an agent should read this site
Start at [llms.txt](https://whatsapp.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://whatsapp.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://whatsapp.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://whatsapp.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://whatsapp.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://whatsapp.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://whatsapp.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). What this page will let an agent do — and what it MUST confirm with the
visitor first — is declared in [agent-permissions.json](https://whatsapp.demo.busymate.ai/agent-permissions.json).

## Usage & examples
Call this site's MCP server at `https://whatsapp.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `opening_hours` — Marlow's Kitchen's opening hours, by day of the week, including brunch/dinner service windows and any closed days.
- `list_menu` — List every dish and drink Marlow's Kitchen serves, grouped by section, with prices.
- `search_menu` — Search Marlow's Kitchen's menu by name, ingredient, or keyword (e.g. an allergen or 'vegetarian').
- `check_availability` — Check whether Marlow's Kitchen has a table for a given date, time and party size, with nearby alternative times if that exact slot is full.
- `book_table` — Do NOT call this tool to ask the visitor for date, time, party size, name or phone — call open_booking_form for that instead, it is the ONLY approved way to collect a missing field, never a chat question. Book a table at Marlow's Kitchen, but ONLY once the visitor has already stated every one of those five fields themselves, in their own words, earlier in this conversation. Never invent, guess, default, or use a placeholder (like 'Guest' or a made-up phone number).
- `get_my_reservations` — List the reservations at Marlow's Kitchen booked under a phone number. Requires an identified (signed-in) visitor — call it with that visitor's own phone number, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)
- `cancel_reservation` — Cancel a reservation at Marlow's Kitchen by its confirmation code + the phone number it was booked under. Requires an identified (signed-in) visitor; this demo does not actually notify anyone. (identified visitors only)
- `open_booking_form` — Open an inline booking form on the page for the visitor to fill in and submit themselves — name, phone, party size, date and time, one "Book table" button. Used instead of asking for those details one at a time in the conversation. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
