---
title: "Northwind Coffee Co."
description: "A specialty coffee roaster in Portland, Oregon, roasting in 5kg batches to order since 2016. This is a Busymate AI demonstration store — a working storefront you can shop, sign in to and put an assistant through its paces on. No order is fulfilled, no payment is taken, and the customer behind the sign-in button is not a real person."
last_updated: 2026-09-14
---

# Northwind Coffee Co.

Source: https://web.demo.busymate.ai/

> A specialty coffee roaster in Portland, Oregon, roasting in 5kg batches to order since 2016. This is a Busymate AI demonstration store — a working storefront you can shop, sign in to and put an assistant through its paces on. No order is fulfilled, no payment is taken, and the customer behind the sign-in button is not a real person.

## The coffee

| SKU | Coffee | Origin | Roast | Process | Tasting notes | Size | Price |
|---|---|---|---|---|---|---|---|
| NW-ETH-250 | Ethiopia Yirgacheffe | Kochere, Yirgacheffe | Light | Washed | Bergamot, jasmine, lemon acidity | 250g | $18 |
| NW-COL-250 | Colombia Huila | Pitalito, Huila | Medium | Washed | Caramel, red apple, balanced | 250g | $16 |
| NW-SUM-250 | Sumatra Mandheling | Lintong, North Sumatra | Dark | Wet-hulled | Cedar, earth, syrupy body | 250g | $17 |
| NW-ESP-250 | Northwind Espresso | Brazil + Colombia | Medium-dark | Blend | Chocolate, smooth, low acidity | 250g | $15 |
| NW-DEC-250 | Midnight Decaf | Huila, Colombia | Medium | Sugarcane EA decaf | Cocoa, dried plum | 250g | $17 |
| NW-SMP-4X100 | Roaster's Sampler | Four origins | Mixed | Varies | This week's roast, four ways | 4 x 100g | $26 |

Live prices and stock also come from the MCP server's `search_coffee` and `get_coffee` tools, and from `GET /api/store/products`.

## The roastery

Northwind started in 2016 with a 5kg drum roaster in a Portland garage and a standing order from the cafe across the street. We buy from the same six farms and cooperatives, roast in small batches to order, and ship the day we roast. Every bag carries its roast date. If one reaches you more than three days after that date, something has gone wrong and we want to hear about it.

## Policies

- [Delivery](https://web.demo.busymate.ai/shipping.md) — 2-4 business days for $5, free over $40; next-day $12 before 11:00. US and Canada.
- [Returns and refunds](https://web.demo.busymate.ai/returns.md) — unopened within 30 days; opened within 14 days of delivery, keep the coffee.
- [Coffee subscription](https://web.demo.busymate.ai/subscription.md) — 15% off, free delivery, every 2, 4 or 6 weeks, cancel any time.
- [Brew guide](https://web.demo.busymate.ai/brewing.md) — 1:16, 195-205°F, 3-4 minutes for a pour-over.

## The demo customer

One throwaway customer is provided so the identified experience can be tested without an account. Ask the assistant about an order or a return and, the moment it cannot yet see who is asking, a sign-in card appears in the conversation on its own; using it hands the assistant a short-lived proof of who they are, and order lookups and returns then work, for that customer only.

The customer is Alex Rivera, a customer since March 2025, with three orders — NW-10432 (in transit), NW-10218 and NW-09977 (both delivered) — and an active subscription of two bags of Northwind Espresso every four weeks.

## What an agent can do here

- Read: this page, the four policy pages, and each of their `.md` twins.
- Discover: [/llms.txt](https://web.demo.busymate.ai/llms.txt), [/agents.json](https://web.demo.busymate.ai/agents.json), [/webmcp-catalog.json](https://web.demo.busymate.ai/webmcp-catalog.json).
- Act in the page: five WebMCP tools — search the range, add to the cart, read the cart, check an order, start a return.
- Act over the network: the MCP server at `https://web.demo.busymate.ai/mcp` carries the catalogue and the policies, open to anyone.


## Sitemap

Every page on this site: [sitemap.md](https://web.demo.busymate.ai/sitemap.md)
