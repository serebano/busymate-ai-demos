# AGENTS.md

## Project overview
Sol & Salt Swimwear — A swim and resort-wear demo showing one assistant answering both Meta inboxes: faithful previews of a Messenger thread and an Instagram DM around the live assistant, grounded chat over the collection, size chart and policy, an MCP server over the catalogue, sizing, orders and returns, WebMCP in-page actions, and identified-customer order lookup.

## How an agent should read this site
Start at [llms.txt](https://meta.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://meta.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://meta.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://meta.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://meta.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://meta.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://meta.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). What this page will let an agent do — and what it MUST confirm with the
visitor first — is declared in [agent-permissions.json](https://meta.demo.busymate.ai/agent-permissions.json).

## Usage & examples
Call this site's MCP server at `https://meta.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `list_collection` — The whole Sol & Salt Swimwear collection — every swim and resort piece in stock, with its code, fabric, size range, colourways and price. Optionally narrowed to one category.
- `search_products` — Search the Sol & Salt Swimwear collection by name, code, fabric, colourway or a word for what it is for ('laps', 'long swim', 'cover-up', 'UPF', 'high waist'). Returns the matching pieces in full.
- `size_guide` — Sol & Salt Swimwear's size chart in centimetres and inches, and — when body measurements are given — the size this label would actually put someone in for a named piece, with the fit note that goes with it. Always call this before suggesting a size; never guess one.
- `shipping_and_returns` — Sol & Salt Swimwear's delivery times, costs and duty handling, plus the returns and exchange policy — the window, what makes a piece returnable, and how a refund is paid back.
- `start_return` — Do NOT ask the customer for the order number, the item or the reason in the conversation — calling this tool with whatever is already known IS how the return card opens, and it is the only approved way to collect a missing one. Starts a return or exchange at Sol & Salt Swimwear and reports the return number, the window, and what happens to the refund. Never invent, guess or default an order number, an item or a reason. (MCP server only, not registered on the page)
- `get_my_orders` — Every order belonging to the signed-in customer at Sol & Salt Swimwear — what was in it, what it cost, where it is, and whether it can still be returned or cancelled. Requires an identified (signed-in) visitor: call it with that visitor's own email from context, never one typed mid-conversation by an unidentified visitor. (identified visitors only)
- `cancel_order` — Cancel a Sol & Salt Swimwear order that has NOT been dispatched yet, for the signed-in customer. Requires an identified (signed-in) visitor and their explicit confirmation first; an order already on its way has to be returned instead, not cancelled. (identified visitors only) (MCP server only, not registered on the page)
- `open_return_form` — Open the return card on the page for the visitor to fill in and submit themselves — order number, which piece, reason, one button. Used instead of asking for those three things one at a time in the conversation. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. A demo customer is provided on the page, so the identified experience — her orders, a cancellation, a return against a real order — can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
