# AGENTS.md

## Project overview
Fernweh Supply Co. — A working demonstration WooCommerce store: a live Busymate AI assistant grounded in this shop's own catalogue and policy pages, six of the page's own actions published over WebMCP, an MCP server over the shop's real product and order data, a provided demo customer with five orders for testing the identified experience, and hand-off to a person.

## How an agent should read this site
Start at [llms.txt](https://woo.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://woo.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://woo.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://woo.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://woo.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://woo.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://woo.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). Per-tool access (public vs. identified-visitors-only, read-only vs.
confirmation-required) is declared in [.well-known/agent-permissions.json](https://woo.demo.busymate.ai/.well-known/agent-permissions.json) — treat a tool NOT listed there as denied.

## Usage & examples
Call this site's MCP server at `https://woo.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `search_products` — Search the Fernweh Supply Co. range — packs and bags, merino layers, bottles and flasks, notebooks and paper — by words, category, price ceiling or availability, and return each match with its SKU, price, whether it is in stock and a link to its page. Reads the shop's own public catalogue, so it needs no sign-in. (MCP server only, not registered on the page)
- `get_product` — Everything the shop publishes about one product — full description, materials, weight, dimensions, price, whether it is in stock, and the link — found by SKU or by name. (MCP server only, not registered on the page)
- `get_delivery_and_returns` — What delivery costs and how long it takes to each of the four zones the shop ships to, the free-delivery thresholds, and where the full shipping and returns policies are. (MCP server only, not registered on the page)
- `list_my_orders` — Every order on the signed-in customer's account — number, status, what was in it and the total. Answers only for the customer the caller's signed proof identifies; it cannot be pointed at anybody else. (identified visitors only) (MCP server only, not registered on the page)
- `get_order_status` — Where one of the signed-in customer's orders has got to, what it contains and what the status actually means. With no order number it answers about the most recent one. Call this the moment an order is asked about — never ask for the order number in prose first: call it with whatever you already have and the action card in the chat collects the rest as a field the customer fills in. (identified visitors only) (MCP server only, not registered on the page)
- `start_return` — Open a return for one item on one of the signed-in customer's orders. Writes the return reference onto the real order as a customer-visible note and reports it back. Only a paid or completed order can be returned. Call this as soon as a return is mentioned — never ask for the order number, the item or the reason in prose first: call it with whatever you already have and the action card in the chat collects the rest as fields the customer fills in and submits. (identified visitors only) (MCP server only, not registered on the page)
- `search_the_shop` — Search the Fernweh range from the page itself and return each match with its SKU, price, whether it is in stock and its link — the same catalogue the shop pages show. (WebMCP page tool only, not on the MCP server)
- `view_cart` — What is in this visitor's cart right now, with each line, the item count, the delivery line and the total. (WebMCP page tool only, not on the MCP server)
- `add_to_cart` — Put one of Fernweh's products in this visitor's cart by SKU or by name, and report the cart back. Changes the page, so it is confirmed before it runs. (WebMCP page tool only, not on the MCP server)
- `remove_from_cart` — Remove one line from this visitor's cart by SKU or by name, and report what is left. Changes the page, so it is confirmed before it runs. (WebMCP page tool only, not on the MCP server)
- `open_product` — Take this browser to one product's own page, by SKU or by name — the same thing clicking the product in the shop does. (WebMCP page tool only, not on the MCP server)
- `who_is_signed_in` — Whether a customer is signed in to this store in this browser, and their display name if they are. Reports no personal detail beyond the name the store already shows them. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. This store mints the proof itself with its own ES256 key and publishes the key set at https://woo.demo.busymate.ai/.well-known/jwks.json. A demo customer with five real orders is provided, one click from inside the chat, so the identified experience can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
