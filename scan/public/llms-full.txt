# Beacon

Source: https://scan.demo.busymate.ai/

> A Busymate AI demo of the site-scan quick start: paste any public website address and see the grounded assistant preview and AI-readiness scorecard it produces in one click, with no sign-up and no card. Beacon's own MCP server can score any host live, and a provided demo visitor can sign in to see their scan history for this session.

## What happens when you press the button

1. **Paste an address** — any public website, yours, a client's, or one of the three examples below.
2. **It reads the site and grades it** — a fast, no-browser read of the public pages builds an AI-readiness scorecard: six checks (llms.txt, llms-full.txt, AI crawlers in robots.txt, sitemap, content in the page source, structured data), each with a "how to add it" link.
3. **Meet the assistant** — a chat grounded only in that site's own pages opens on the same screen.

Nothing is installed on the scanned site and nothing is written back to it.

## Three pre-scanned examples

| Site | What it is | Live result |
|---|---|---|
| busydrivers.com | A real driver-earnings product | https://busymate.ai/try/busydrivers.com |
| Northwind Coffee | Busymate AI's own web-widget reference demo | https://busymate.ai/try/web.demo.busymate.ai |
| Northline Outdoor | Busymate AI's own Shopify reference demo | https://busymate.ai/try/shopify.demo.busymate.ai |

## Score any site, live

Beacon runs its own MCP server at `/mcp` — ask the assistant (or any MCP client) to grade a site and it calls `get_readiness` against the same checker the quick start itself uses, right in the conversation, no visit to busymate.ai required.

## The demo visitor

One throwaway visitor, Jordan Blake, is provided so the identified experience can be tested without a real account. Signing in (the button on the page, or the chat's own "Sign in" control) hands the assistant a short-lived proof of who is asking; `my_recent_scans` then answers with that session's own scan history — for that visitor only, never for anyone else.

## What a visitor actually gets

- A grounded chat, embedded on this page, that answers only from a knowledge base about this quick start — what it does, whether it needs a sign-up, what it costs.
- An AI-readiness scorecard that names the fix for anything missing, linked from every check.
- Five tools: four public (`scan_site`, `list_examples`, `show_example`, `get_readiness`) reachable both on the page (WebMCP) and over Beacon's own MCP server; `my_recent_scans` is identified, MCP-only.
- A hand-off to a person — type "talk to a human" in the chat.

## What an agent can do here

- Read: this page, its own [/llms.txt](https://scan.demo.busymate.ai/llms.txt) and [/llms-full.txt](https://scan.demo.busymate.ai/llms-full.txt).
- Discover: [/llms.txt](https://scan.demo.busymate.ai/llms.txt), [/agents.json](https://scan.demo.busymate.ai/agents.json), [/webmcp-catalog.json](https://scan.demo.busymate.ai/webmcp-catalog.json).
- Act in the page: four WebMCP page tools — `scan_site(url)` opens the real quick start for any address; `list_examples()` lists the three examples with their result URLs; `show_example(site)` reveals one of them; `get_readiness(url)` scores any host live.
- Act over the network: the MCP server at `https://scan.demo.busymate.ai/mcp` (JSON-RPC 2.0 over HTTPS) carries the same four tools plus `my_recent_scans`, open to anyone — the connection itself needs no credential, and the identified tool additionally needs a signed proof of who is asking.

## Learn more

- [Let the assistant use your page (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Recognize signed-in visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Set up human handoff](https://busymate.ai/docs/guides/human-handoff-setup)
- [Teach your assistant your own content](https://busymate.ai/docs/guides/knowledge)
- [Is your website agent-ready? The complete checklist](https://busymate.ai/articles/is-your-website-agent-ready-checklist)
