---
title: "Patchwell"
description: "An IT-helpdesk-for-small-teams demo showing 'your mate' inside Slack: a live Slack-style view of the assistant, grounded chat over the service catalogue and plans, an MCP server over tickets, access requests, help articles and live system status, WebMCP in-page helpdesk actions, and identified-customer ticket lookup."
last_updated: 2026-09-14
---

# Patchwell

> An IT-helpdesk-for-small-teams demo showing 'your mate' inside Slack: a live Slack-style view of the assistant, grounded chat over the service catalogue and plans, an MCP server over tickets, access requests, help articles and live system status, WebMCP in-page helpdesk actions, and identified-customer ticket lookup.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Patchwell](https://slack.demo.busymate.ai/)
- [The Slack integration](https://busymate.ai/integrations/slack)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://slack.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `service_hours` — Patchwell's helpdesk hours, the on-call cover outside them, and the response-time targets for each priority (P1/P2/P3).
- `list_services` — The full Patchwell service catalogue — every kind of IT request a team can raise (onboarding, access, devices, network, security, licences) with its code, plan availability and turnaround.
- `search_help` — Search Patchwell's help articles by keyword — how to reset MFA, join the VPN, get a loaner laptop, add a SaaS seat, and so on. Returns the matching articles with their steps.
- `system_status` — Live status of the systems Patchwell manages for its customers — SSO, Wi-Fi, VPN, email, device management and the Slack helpdesk itself — plus any open incident.
- `open_ticket` — Do NOT call this to ask the person for the category, summary, urgency, name or email — calling it with whatever is already known IS how the ticket form opens, never a chat question for a missing field. Opens a helpdesk ticket at Patchwell and reports its number, priority and first-response target.
- `request_access` — Do NOT call this to ask the person which app, which role, their name, email or reason — calling it with whatever is already known IS how the access-request form opens. Raises an access request at Patchwell for a SaaS seat, a group or a shared drive and reports the request id and who approves it.
- `ticket_status` — Look up one helpdesk ticket or access request at Patchwell by its number and the email it was raised under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.
- `get_my_tickets` — Every open and recent ticket and access request belonging to the signed-in customer, with their team's plan and seat count. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. A demo customer is provided on the page, so the identified experience can be tested without a real account.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Publish your page's actions (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Human hand-off](https://busymate.ai/docs/guides/human-handoff-setup)
- [Busymate AI for Slack](https://busymate.ai/integrations/slack)

## Optional
- [llms-full.txt](https://slack.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://slack.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://slack.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://slack.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://slack.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://slack.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://slack.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://slack.demo.busymate.ai/sitemap.md)