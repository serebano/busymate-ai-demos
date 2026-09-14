---
title: "Sol & Salt Swimwear"
description: "A swim and resort-wear demo showing one assistant answering both Meta inboxes: faithful previews of a Messenger thread and an Instagram DM around the live assistant, grounded chat over the collection, size chart and policy, an MCP server over the catalogue, sizing, orders and returns, WebMCP in-page actions, and identified-customer order lookup."
last_updated: 2026-09-14
---

# Sol & Salt Swimwear

> A swim and resort-wear demo showing one assistant answering both Meta inboxes: faithful previews of a Messenger thread and an Instagram DM around the live assistant, grounded chat over the collection, size chart and policy, an MCP server over the catalogue, sizing, orders and returns, WebMCP in-page actions, and identified-customer order lookup.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Sol & Salt Swimwear](https://meta.demo.busymate.ai/)
- [The Messenger integration](https://busymate.ai/integrations/messenger)
- [The Instagram integration](https://busymate.ai/integrations/instagram)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://meta.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `list_collection` — The whole Sol & Salt Swimwear collection — every swim and resort piece in stock, with its code, fabric, size range, colourways and price. Optionally narrowed to one category.
- `search_products` — Search the Sol & Salt Swimwear collection by name, code, fabric, colourway or a word for what it is for ('laps', 'long swim', 'cover-up', 'UPF', 'high waist'). Returns the matching pieces in full.
- `size_guide` — Sol & Salt Swimwear's size chart in centimetres and inches, and — when body measurements are given — the size this label would actually put someone in for a named piece, with the fit note that goes with it. Always call this before suggesting a size; never guess one.
- `shipping_and_returns` — Sol & Salt Swimwear's delivery times, costs and duty handling, plus the returns and exchange policy — the window, what makes a piece returnable, and how a refund is paid back.
- `start_return` — Do NOT ask the customer for the order number, the item or the reason in the conversation — calling this tool with whatever is already known IS how the return card opens, and it is the only approved way to collect a missing one. Starts a return or exchange at Sol & Salt Swimwear and reports the return number, the window, and what happens to the refund. Never invent, guess or default an order number, an item or a reason. (MCP server only, not registered on the page)
- `get_my_orders` — Every order belonging to the signed-in customer at Sol & Salt Swimwear — what was in it, what it cost, where it is, and whether it can still be returned or cancelled. Requires an identified (signed-in) visitor: call it with that visitor's own email from context, never one typed mid-conversation by an unidentified visitor. (identified visitors only)
- `cancel_order` — Cancel a Sol & Salt Swimwear order that has NOT been dispatched yet, for the signed-in customer. Requires an identified (signed-in) visitor and their explicit confirmation first; an order already on its way has to be returned instead, not cancelled. (identified visitors only) (MCP server only, not registered on the page)
- `open_return_form` — Open the return card on the page for the visitor to fill in and submit themselves — order number, which piece, reason, one button. Used instead of asking for those three things one at a time in the conversation. (WebMCP page tool only, not on the MCP server)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. A demo customer is provided on the page, so the identified experience — her orders, a cancellation, a return against a real order — can be tested without a real account.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Publish your page's actions (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Ask with a form card](https://busymate.ai/docs/guides/form-cards)
- [Human hand-off](https://busymate.ai/docs/guides/human-handoff-setup)
- [Busymate AI for Messenger](https://busymate.ai/integrations/messenger)
- [Busymate AI for Instagram](https://busymate.ai/integrations/instagram)

## Optional
- [llms-full.txt](https://meta.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://meta.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://meta.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://meta.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://meta.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://meta.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://meta.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://meta.demo.busymate.ai/sitemap.md)