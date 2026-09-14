# AGENTS.md

## Project overview
Northwind Coffee Co. — A working demonstration coffee store: a live Busymate AI assistant grounded in its own catalogue and policies, five of the page's own actions published over WebMCP, an MCP server holding the catalogue and order book, a provided demo customer for testing the identified experience, and a hand-off to a person.

## How an agent should read this site
Start at [llms.txt](https://web.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://web.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://web.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://web.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://web.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://web.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://web.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). Per-tool access (public vs. identified-visitors-only, read-only vs.
confirmation-required) is declared in [.well-known/agent-permissions.json](https://web.demo.busymate.ai/.well-known/agent-permissions.json) — treat a tool NOT listed there as denied.

## Usage & examples
Call this site's MCP server at `https://web.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `search_coffee` — Search Northwind Coffee's range by name, origin, roast, tasting note or use (espresso, filter, decaf, gift). Returns price, size and what is in stock.
- `get_coffee` — Full detail for one of Northwind's coffees, by SKU or by name. (MCP server only, not registered on the page)
- `store_policy` — Northwind's own wording for one of its policies: shipping, returns, subscription, brewing. (MCP server only, not registered on the page)
- `contact_northwind` — Leave a message for a person at Northwind — a question the assistant cannot answer, a problem with an order, or anything that needs a human. Collects a name, an email address and the message itself. This is NOT the tool for 'where is my order' — call get_order_status for that, even signed out (it is what shows the sign-in card). The email is the VISITOR'S OWN real address: it must come from something they typed in this conversation. Never invent one, and never fill it with a placeholder (example.com, test@…, noreply@…, user@…) just to satisfy this schema — if the visitor has not given an email, ask them for it (the form card does this) instead of calling this tool with a guess. The server refuses placeholder-looking addresses. (MCP server only, not registered on the page)
- `get_order_status` — THE tool for any order or delivery question — 'where is my order', tracking, ETA. Call this FIRST for that ask, even when the visitor is signed out: a not-signed-in refusal is the expected, correct outcome and is what shows the sign-in card. Never substitute contact_northwind for this just because it is signed out. Once signed in, returns where one of the customer's orders is, with carrier, tracking number and expected delivery date. Answers only for the customer signed in on this page. (identified visitors only) (WebMCP page tool only, not on the MCP server)
- `start_return` — Open a return for one item on one of the signed-in customer's orders and report the refund and what happens next. (identified visitors only) (WebMCP page tool only, not on the MCP server)
- `add_to_cart` — Put a bag of one of Northwind's coffees in this visitor's cart, by SKU or by name. (WebMCP page tool only, not on the MCP server)
- `view_cart` — What is in the cart right now, with the subtotal, the delivery charge and the total. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. A demo customer is provided on the page, so the identified experience can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
