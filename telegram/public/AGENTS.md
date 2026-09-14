# AGENTS.md

## Project overview
Nomad Circuits — A travel-tech and gadget-repair shop demo showing 'your mate' on Telegram: a live preview of the Telegram conversation, grounded chat, an MCP server over the shop's own catalogue/hours/repair data, WebMCP in-page shop actions, and identified-customer order/repair lookup.

## How an agent should read this site
Start at [llms.txt](https://telegram.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://telegram.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://telegram.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://telegram.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://telegram.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://telegram.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://telegram.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). Per-tool access (public vs. identified-visitors-only, read-only vs.
confirmation-required) is declared in [.well-known/agent-permissions.json](https://telegram.demo.busymate.ai/.well-known/agent-permissions.json) — treat a tool NOT listed there as denied.

## Usage & examples
Call this site's MCP server at `https://telegram.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `opening_hours` — Nomad Circuits's opening hours for walk-in orders and repair drop-off, by day of the week, including any closed days.
- `list_catalog` — List everything Nomad Circuits sells and repairs, grouped by category, with prices and SKUs.
- `search_catalog` — Search Nomad Circuits's catalogue and repair services by name, category or keyword (e.g. 'charging', 'earbuds', 'screen repair').
- `place_order` — Do NOT call this to ask the visitor for the item, quantity, name, email or shipping country — calling it with whatever is already known IS how the order form opens, never a chat question for a missing field. Places an order at Nomad Circuits for one catalogue item and reports the order number and status.
- `book_repair` — Do NOT call this to ask the visitor for the device, issue, name, contact email or preferred slot — calling it with whatever is already known IS how the repair form opens, never a chat question for a missing field. Books a repair drop-off slot at Nomad Circuits and reports the ticket number.
- `track_order` — Look up the status of an order OR a repair ticket at Nomad Circuits by its number and the email it was placed under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.
- `get_my_account` — Every order and repair ticket belonging to the signed-in customer. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)
- `contact_us` — Leave a message for a person at Nomad Circuits — a question the assistant cannot answer, a warranty dispute, or a bulk order. Collects a name, an email address and the message itself.

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
