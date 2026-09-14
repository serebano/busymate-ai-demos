---
title: "Fernweh Supply Co."
description: "A working demonstration WooCommerce store: a live Busymate AI assistant grounded in this shop's own catalogue and policy pages, six of the page's own actions published over WebMCP, an MCP server over the shop's real product and order data, a provided demo customer with five orders for testing the identified experience, and hand-off to a person."
last_updated: 2026-09-14
---

# Fernweh Supply Co.

> A working demonstration WooCommerce store: a live Busymate AI assistant grounded in this shop's own catalogue and policy pages, six of the page's own actions published over WebMCP, an MCP server over the shop's real product and order data, a provided demo customer with five orders for testing the identified experience, and hand-off to a person.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [The shop](https://woo.demo.busymate.ai/): Fourteen products across packs and bags, merino layers, bottles and flasks, and notebooks and paper — with prices, stock and the block explaining every capability this demo shows — Markdown: https://woo.demo.busymate.ai/index.md
- [Shipping](https://woo.demo.busymate.ai/shipping/): What delivery costs and how long it takes to each of the four zones, the free-delivery thresholds, and what happens when a parcel goes missing — Markdown: https://woo.demo.busymate.ai/shipping.md
- [Returns & Repairs](https://woo.demo.busymate.ai/returns/): The 30-day return window, what is excluded, and the repair service for anything Fernweh made — Markdown: https://woo.demo.busymate.ai/returns.md
- [Privacy](https://woo.demo.busymate.ai/privacy/): What this demonstration store records, and the plain warning not to enter real personal data — Markdown: https://woo.demo.busymate.ai/privacy.md
- [Terms](https://woo.demo.busymate.ai/terms/): The terms of sale, and the statement that Fernweh Supply Co. is an invented brand that trades with nobody — Markdown: https://woo.demo.busymate.ai/terms.md

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://woo.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
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

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. This store mints the proof itself with its own ES256 key and publishes the key set at https://woo.demo.busymate.ai/.well-known/jwks.json. A demo customer with five real orders is provided, one click from inside the chat, so the identified experience can be tested without a real account.

## Learn more
- [Let the assistant use your page (WebMCP)](https://busymate.ai/docs/guides/page-tools): How the six page tools above are registered
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Connect your WooCommerce store](https://busymate.ai/docs/guides/woocommerce): The store connection this shop is wired through
- [Recognise signed-in customers](https://busymate.ai/docs/guides/identified-visitors)
- [Ask with a card instead of a paragraph](https://busymate.ai/docs/guides/form-cards)
- [Set up human handoff](https://busymate.ai/docs/guides/human-handoff-setup)
- [Teach your assistant your own content](https://busymate.ai/docs/guides/knowledge)
- [Ask without signing in: the public tools](https://busymate.ai/docs/guides/public-tools)
- [Is your website agent-ready? The complete checklist](https://busymate.ai/articles/is-your-website-agent-ready-checklist)

## Optional
- [llms-full.txt](https://woo.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://woo.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://woo.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://woo.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://woo.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://woo.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://woo.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://woo.demo.busymate.ai/sitemap.md)