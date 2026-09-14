# AGENTS.md

## Project overview
Beacon — A demo of the Busymate AI site-scan quick start: paste any public website address and see the grounded assistant preview and AI-readiness scorecard it produces in one click, with no sign-up and no card. Beacon's own MCP server can score any host live, and a provided demo visitor can sign in to see their scan history for this session.

## How an agent should read this site
Start at [llms.txt](https://scan.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://scan.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://scan.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://scan.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://scan.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://scan.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://scan.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). Per-tool access (public vs. identified-visitors-only, read-only vs.
confirmation-required) is declared in [.well-known/agent-permissions.json](https://scan.demo.busymate.ai/.well-known/agent-permissions.json) — treat a tool NOT listed there as denied.

## Usage & examples
Call this site's MCP server at `https://scan.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `scan_site` — Open the real Busymate AI quick start for a website address, at busymate.ai/try/<host> — the same one-click scan and grounded assistant preview this page demonstrates.
- `list_examples` — List the three pre-scanned example sites this demo links to, with their live busymate.ai/try/<host> result URL.
- `show_example` — Detail on one of the three pre-scanned example sites (its label and live quick-start result URL).
- `get_readiness` — Score ANY website's AI-readiness live — the same six-layer checker (llms.txt, agents.json, MCP, WebMCP, structured data, robots/sitemap) the quick start runs, so an agent can grade a site without leaving this conversation.
- `my_recent_scans` — The signed-in demo visitor's own scan history from this session — which hosts they have already looked up with get_readiness or scan_site. Answers only for the customer signed in on this page. (identified visitors only) (MCP server only, not registered on the page)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. A demo visitor (Jordan Blake) is provided on the page, so the identified experience — a scan history for this session — can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
