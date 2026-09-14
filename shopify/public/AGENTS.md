# AGENTS.md

## Project overview
Northline Outdoor — Northline Outdoor — a sample Shopify storefront (20 products: tents, packs, shells, boots, camp kitchen, sleep + light; lifetime warranty, free US shipping over $75) demonstrating the Busymate AI Shopify app: grounded product/policy chat, an MCP server over the store's own data, WebMCP in-page cart actions, and identified-visitor order lookup.

## How an agent should read this site
Start at [llms.txt](https://shopify.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://shopify.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://shopify.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://shopify.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://shopify.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://shopify.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://shopify.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). Per-tool access (public vs. identified-visitors-only, read-only vs.
confirmation-required) is declared in [.well-known/agent-permissions.json](https://shopify.demo.busymate.ai/.well-known/agent-permissions.json) — treat a tool NOT listed there as denied.

## Usage & examples
Call this site's MCP server at `https://shopify.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `list_products` — List every product Northline Outdoor sells, with price and stock.
- `search_products` — Search Northline Outdoor's catalog by name or keyword.
- `get_product` — Get one product's full detail by SKU.
- `get_order_status` — Look up an order's status and tracking by order number + the email on the order. Call it as soon as a shopper asks about an order — even before they give the number: the call shows an order-lookup card in the chat where they type it. Requires an identified (signed-in) visitor on a real store. (identified visitors only)
- `start_return` — Start a return for an item on an order. Call it as soon as a shopper wants to return something — the call shows a return card in the chat where they pick the order, the item and the reason. Requires an identified (signed-in) visitor on a real store; this demo does not actually process anything. (identified visitors only)
- `add_to_cart` — Add a product (by SKU, optionally a specific variant) to this visitor's cart on this page. The cart badge and drawer update immediately. (WebMCP page tool only, not on the MCP server)
- `view_cart` — Show what's currently in this visitor's cart with line totals, subtotal, shipping and total. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
