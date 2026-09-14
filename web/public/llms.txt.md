---
title: "Northwind Coffee Co."
description: "A working demonstration coffee store: a live Busymate AI assistant grounded in its own catalogue and policies, five of the page's own actions published over WebMCP, an MCP server holding the catalogue and order book, a provided demo customer for testing the identified experience, and a hand-off to a person."
last_updated: 2026-09-14
---

# Northwind Coffee Co.

> A working demonstration coffee store: a live Busymate AI assistant grounded in its own catalogue and policies, five of the page's own actions published over WebMCP, an MCP server holding the catalogue and order book, a provided demo customer for testing the identified experience, and a hand-off to a person.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Storefront](https://web.demo.busymate.ai/): The six coffees with origin, process and price, the roastery's story, reviews and the FAQ — Markdown: https://web.demo.busymate.ai/index.md
- [Delivery](https://web.demo.busymate.ai/shipping): What delivery costs, how long it takes, where Northwind ships and what happens if an order goes missing — Markdown: https://web.demo.busymate.ai/shipping.md
- [Returns and refunds](https://web.demo.busymate.ai/returns): The two return windows — unopened within 30 days, opened within 14 days of delivery — and what is not covered — Markdown: https://web.demo.busymate.ai/returns.md
- [Coffee subscription](https://web.demo.busymate.ai/subscription): Cadence, the 15% discount, free delivery, and how to pause, skip, swap or cancel — Markdown: https://web.demo.busymate.ai/subscription.md
- [Brew guide](https://web.demo.busymate.ai/brewing): Ratios, temperatures and timings for pour-over, French press, espresso and AeroPress — Markdown: https://web.demo.busymate.ai/brewing.md

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://web.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `search_coffee` — Search Northwind Coffee's range by name, origin, roast, tasting note or use (espresso, filter, decaf, gift). Returns price, size and what is in stock.
- `get_coffee` — Full detail for one of Northwind's coffees, by SKU or by name. (MCP server only, not registered on the page)
- `store_policy` — Northwind's own wording for one of its policies: shipping, returns, subscription, brewing. (MCP server only, not registered on the page)
- `contact_northwind` — Leave a message for a person at Northwind — a question the assistant cannot answer, a problem with an order, or anything that needs a human. Collects a name, an email address and the message itself. This is NOT the tool for 'where is my order' — call get_order_status for that, even signed out (it is what shows the sign-in card). The email is the VISITOR'S OWN real address: it must come from something they typed in this conversation. Never invent one, and never fill it with a placeholder (example.com, test@…, noreply@…, user@…) just to satisfy this schema — if the visitor has not given an email, ask them for it (the form card does this) instead of calling this tool with a guess. The server refuses placeholder-looking addresses. (MCP server only, not registered on the page)
- `get_order_status` — THE tool for any order or delivery question — 'where is my order', tracking, ETA. Call this FIRST for that ask, even when the visitor is signed out: a not-signed-in refusal is the expected, correct outcome and is what shows the sign-in card. Never substitute contact_northwind for this just because it is signed out. Once signed in, returns where one of the customer's orders is, with carrier, tracking number and expected delivery date. Answers only for the customer signed in on this page. (identified visitors only) (WebMCP page tool only, not on the MCP server)
- `start_return` — Open a return for one item on one of the signed-in customer's orders and report the refund and what happens next. (identified visitors only) (WebMCP page tool only, not on the MCP server)
- `add_to_cart` — Put a bag of one of Northwind's coffees in this visitor's cart, by SKU or by name. (WebMCP page tool only, not on the MCP server)
- `view_cart` — What is in the cart right now, with the subtotal, the delivery charge and the total. (WebMCP page tool only, not on the MCP server)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. A demo customer is provided on the page, so the identified experience can be tested without a real account.

## Learn more
- [Let the assistant use your page (WebMCP)](https://busymate.ai/docs/guides/page-tools): How the five page tools above are registered
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Recognize signed-in customers](https://busymate.ai/docs/guides/identified-visitors)
- [Set up human handoff](https://busymate.ai/docs/guides/human-handoff-setup)
- [Teach your assistant your own content](https://busymate.ai/docs/guides/knowledge)
- [Ask without signing in: the public tools](https://busymate.ai/docs/guides/public-tools)
- [Is your website agent-ready? The complete checklist](https://busymate.ai/articles/is-your-website-agent-ready-checklist)

## Optional
- [llms-full.txt](https://web.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://web.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://web.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://web.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://web.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://web.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://web.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://web.demo.busymate.ai/sitemap.md)