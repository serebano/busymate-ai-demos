# AGENTS.md

## Project overview
Patchwell — An IT-helpdesk-for-small-teams demo showing 'your mate' inside Slack: a live Slack-style view of the assistant, grounded chat over the service catalogue and plans, an MCP server over tickets, access requests, help articles and live system status, WebMCP in-page helpdesk actions, and identified-customer ticket lookup.

## How an agent should read this site
Start at [llms.txt](https://slack.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://slack.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://slack.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://slack.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://slack.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://slack.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://slack.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). What this page will let an agent do — and what it MUST confirm with the
visitor first — is declared in [agent-permissions.json](https://slack.demo.busymate.ai/agent-permissions.json).

## Usage & examples
Call this site's MCP server at `https://slack.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `service_hours` — Patchwell's helpdesk hours, the on-call cover outside them, and the response-time targets for each priority (P1/P2/P3).
- `list_services` — The full Patchwell service catalogue — every kind of IT request a team can raise (onboarding, access, devices, network, security, licences) with its code, plan availability and turnaround.
- `search_help` — Search Patchwell's help articles by keyword — how to reset MFA, join the VPN, get a loaner laptop, add a SaaS seat, and so on. Returns the matching articles with their steps.
- `system_status` — Live status of the systems Patchwell manages for its customers — SSO, Wi-Fi, VPN, email, device management and the Slack helpdesk itself — plus any open incident.
- `open_ticket` — Do NOT call this to ask the person for the category, summary, urgency, name or email — calling it with whatever is already known IS how the ticket form opens, never a chat question for a missing field. Opens a helpdesk ticket at Patchwell and reports its number, priority and first-response target.
- `request_access` — Do NOT call this to ask the person which app, which role, their name, email or reason — calling it with whatever is already known IS how the access-request form opens. Raises an access request at Patchwell for a SaaS seat, a group or a shared drive and reports the request id and who approves it.
- `ticket_status` — Look up one helpdesk ticket or access request at Patchwell by its number and the email it was raised under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.
- `get_my_tickets` — Every open and recent ticket and access request belonging to the signed-in customer, with their team's plan and seat count. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor. (identified visitors only)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. A demo customer is provided on the page, so the identified experience can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
