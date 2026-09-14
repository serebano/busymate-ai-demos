---
title: "Nomad Circuits"
description: "A travel-tech and gadget-repair shop demo showing 'your mate' on Telegram: a live preview of the Telegram conversation, grounded chat, an MCP server over the shop's own catalogue/hours/repair data, WebMCP in-page shop actions, and identified-customer order/repair lookup."
last_updated: 2026-09-14
---

# Nomad Circuits

> A travel-tech and gadget-repair shop demo showing 'your mate' on Telegram: a live preview of the Telegram conversation, grounded chat, an MCP server over the shop's own catalogue/hours/repair data, WebMCP in-page shop actions, and identified-customer order/repair lookup.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Nomad Circuits](https://telegram.demo.busymate.ai/)
- [The Telegram integration](https://busymate.ai/integrations/telegram)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://telegram.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `opening_hours` — Nomad Circuits's opening hours for walk-in orders and repair drop-off, by day of the week, including any closed days.
- `list_catalog` — List everything Nomad Circuits sells and repairs, grouped by category, with prices and SKUs.
- `search_catalog` — Search Nomad Circuits's catalogue and repair services by name, category or keyword (e.g. 'charging', 'earbuds', 'screen repair').
- `place_order` — Do NOT call this to ask the visitor for the item, quantity, name, email or shipping country — calling it with whatever is already known IS how the order form opens, never a chat question for a missing field. Places an order at Nomad Circuits for one catalogue item and reports the order number and status.
- `book_repair` — Do NOT call this to ask the visitor for the device, issue, name, contact email or preferred slot — calling it with whatever is already known IS how the repair form opens, never a chat question for a missing field. Books a repair drop-off slot at Nomad Circuits and reports the ticket number.
- `track_order` — Look up the status of an order OR a repair ticket at Nomad Circuits by its number and the email it was placed under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.
- `get_my_account` — Every order and repair ticket belonging to the signed-in customer. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)
- `contact_us` — Leave a message for a person at Nomad Circuits — a question the assistant cannot answer, a warranty dispute, or a bulk order. Collects a name, an email address and the message itself.

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Publish your page's actions (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Busymate AI for Telegram](https://busymate.ai/integrations/telegram)

## Optional
- [llms-full.txt](https://telegram.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://telegram.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://telegram.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://telegram.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://telegram.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://telegram.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://telegram.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://telegram.demo.busymate.ai/sitemap.md)