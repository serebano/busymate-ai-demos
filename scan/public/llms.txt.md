# Beacon

> A demo of the Busymate AI site-scan quick start: paste any public website address and see the grounded assistant preview and AI-readiness scorecard it produces in one click, with no sign-up and no card. Beacon's own MCP server can score any host live, and a provided demo visitor can sign in to see their scan history for this session.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [The quick-start demo](https://scan.demo.busymate.ai/)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://scan.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `scan_site` — Open the real Busymate AI quick start for a website address, at busymate.ai/try/<host> — the same one-click scan and grounded assistant preview this page demonstrates.
- `list_examples` — List the three pre-scanned example sites this demo links to, with their live busymate.ai/try/<host> result URL.
- `show_example` — Detail on one of the three pre-scanned example sites (its label and live quick-start result URL).
- `get_readiness` — Score ANY website's AI-readiness live — the same six-layer checker (llms.txt, agents.json, MCP, WebMCP, structured data, robots/sitemap) the quick start runs, so an agent can grade a site without leaving this conversation.
- `my_recent_scans` — The signed-in demo visitor's own scan history from this session — which hosts they have already looked up with get_readiness or scan_site. Answers only for the customer signed in on this page. (identified visitors only) (MCP server only, not registered on the page)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. A demo visitor (Jordan Blake) is provided on the page, so the identified experience — a scan history for this session — can be tested without a real account.

## Learn more
- [Let the assistant use your page (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Recognize signed-in visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Set up human handoff](https://busymate.ai/docs/guides/human-handoff-setup)
- [Teach your assistant your own content](https://busymate.ai/docs/guides/knowledge)
- [Is your website agent-ready? The complete checklist](https://busymate.ai/articles/is-your-website-agent-ready-checklist)

## Optional
- [llms-full.txt](https://scan.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://scan.demo.busymate.ai/agents.json): the machine-readable card for this site
- [webmcp-catalog.json](https://scan.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [sitemap.xml](https://scan.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://scan.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone
