---
title: "Northline Outdoor"
description: "Northline Outdoor — a sample Shopify storefront (20 products: tents, packs, shells, boots, camp kitchen, sleep + light; lifetime warranty, free US shipping over $75) demonstrating the Busymate AI Shopify app: grounded product/policy chat, an MCP server over the store's own data, WebMCP in-page cart actions, and identified-visitor order lookup."
last_updated: 2026-09-15
---

# Northline Outdoor

> Northline Outdoor — a sample Shopify storefront (20 products: tents, packs, shells, boots, camp kitchen, sleep + light; lifetime warranty, free US shipping over $75) demonstrating the Busymate AI Shopify app: grounded product/policy chat, an MCP server over the store's own data, WebMCP in-page cart actions, and identified-visitor order lookup.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Storefront](https://shopify.demo.busymate.ai/)
- [Catalog (JSON)](https://shopify.demo.busymate.ai/catalog.json)
- [Photo credits](https://shopify.demo.busymate.ai/img/CREDITS.md)
- [The Shopify integration](https://busymate.ai/integrations/shopify)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://shopify.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `list_products` — List every product Northline Outdoor sells, with price and stock.
- `search_products` — Search Northline Outdoor's catalog by name or keyword.
- `get_product` — Get one product's full detail by SKU.
- `get_order_status` — Look up an order's status and tracking by order number + the email on the order. Call it as soon as a shopper asks about an order — even before they give the number: the call shows an order-lookup card in the chat where they type it. Requires an identified (signed-in) visitor on a real store. (identified visitors only)
- `start_return` — Start a return for an item on an order. Call it as soon as a shopper wants to return something — the call shows a return card in the chat where they pick the order, the item and the reason. Requires an identified (signed-in) visitor on a real store; this demo does not actually process anything. (identified visitors only)
- `add_to_cart` — Add a product (by SKU, optionally a specific variant) to this visitor's cart on this page. The cart badge and drawer update immediately. (WebMCP page tool only, not on the MCP server)
- `view_cart` — Show what's currently in this visitor's cart with line totals, subtotal, shipping and total. (WebMCP page tool only, not on the MCP server)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Busymate AI for Shopify](https://busymate.ai/integrations/shopify)

## Optional
- [llms-full.txt](https://shopify.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://shopify.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://shopify.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://shopify.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://shopify.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://shopify.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://shopify.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://shopify.demo.busymate.ai/sitemap.md)