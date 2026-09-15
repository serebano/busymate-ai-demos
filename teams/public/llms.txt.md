---
title: "Bramble & Co."
description: "An HR-and-benefits-desk demo showing 'your mate' in a Microsoft Teams-style chat pane: grounded answers from a 300-person firm's own handbook, an MCP server over the benefit plans and their employee contributions, the payroll calendar and the leave book, WebMCP in-page actions, an inline leave form, and identified-employee leave balances."
last_updated: 2026-09-15
---

# Bramble & Co.

> An HR-and-benefits-desk demo showing 'your mate' in a Microsoft Teams-style chat pane: grounded answers from a 300-person firm's own handbook, an MCP server over the benefit plans and their employee contributions, the payroll calendar and the leave book, WebMCP in-page actions, an inline leave form, and identified-employee leave balances.

This is a Busymate AI integration demo — a working example, not a real store.
Real orders, payments and customer accounts do not exist here.

## Pages
- [Bramble & Co. — people and benefits](https://teams.demo.busymate.ai/)
- [The Microsoft Teams integration](https://busymate.ai/integrations/teams)

## Talk to it
A live Busymate AI assistant is embedded on every page, grounded only in
this site's own content. It cites its sources and says when it does not
know something instead of guessing.

## Act on it (agents)
This site exposes an MCP server at `https://teams.demo.busymate.ai/mcp` (JSON-RPC 2.0 over
HTTPS). The connection itself needs no credential; a tool marked below for
identified visitors additionally needs a signed proof of who is asking, and
answers for that customer alone. The tools:
- `list_benefit_plans` — Every benefit Bramble & Co. offers its employees — private medical, dental and optical, pension, income protection and life cover, the wellbeing allowance, the learning fund and the cycle scheme — with what each one costs the employee per month, what the firm pays, and the enrolment window that applies.
- `get_payroll_calendar` — Bramble & Co.'s payroll calendar — the pay date for each month, the cut-off by which a change (hours, expenses, a new bank account) must reach payroll to land in that run, and when payslips appear.
- `search_policies` — Search Bramble & Co.'s employee handbook by keyword — leave types and carry-over, sickness, parental leave, the remote-work policy, expenses and travel, notice periods — and return the matching sections in full, so an answer can quote the handbook rather than paraphrase it.
- `request_leave` — Do NOT call this to ask the person for the leave type, the start date, the end date or a note — calling it with whatever is already known IS how the leave form opens, never a chat question for a missing field. Files a leave request at Bramble & Co. for the approver to pick up, and reports the reference, the working days it uses and the balance that would be left. (MCP server only, not registered on the page)
- `get_my_leave_balance` — The signed-in employee's own leave: annual entitlement, days taken, days booked ahead, what is left, carry-over and its expiry, plus their volunteering and study allowances. Requires an identified (signed-in) visitor — call it with that person's own employee id from context, never one offered mid-conversation by someone unidentified. (identified visitors only)
- `update_bank_details_request` — Do NOT ask for these details in prose — calling this tool with whatever is known IS how its form opens. Asks Bramble & Co.'s payroll team to change where an employee's salary is paid. It FILES A REQUEST only: payroll calls the employee back on a known number to take the account details, so no account number is ever typed into a chat and nothing is changed by this call. Requires an identified (signed-in) visitor. (identified visitors only) (MCP server only, not registered on the page)
- `open_leave_request_form` — Open the leave form on this page for the visitor to fill in and submit themselves — type of leave, first and last day, a note for the approver, one button. Pass anything already known (dates or a leave type stated earlier in the chat) as prefill so only the gaps are left to fill. (WebMCP page tool only, not on the MCP server)

Every tool above that is not marked otherwise is ALSO registered in the page
itself over WebMCP (`document.modelContext`, see `/agents.json` and
`/webmcp-catalog.json`), for a browser agent that never leaves the page.

## Identity
Signed-in visitors get personalized answers through a short-lived launch
proof this site mints itself — see https://busymate.ai/docs/guides/identified-visitors. A demo employee is provided on the page, so the identified experience — a person's own leave balance — can be tested without a real account.

## Learn more
- [Connect your MCP server as assistant tools](https://busymate.ai/docs/guides/connect-mcp-server)
- [Ground the assistant in your own content](https://busymate.ai/docs/guides/knowledge)
- [Identified visitors](https://busymate.ai/docs/guides/identified-visitors)
- [Publish your page's actions (WebMCP)](https://busymate.ai/docs/guides/page-tools)
- [Ask with a form card, not a paragraph](https://busymate.ai/docs/guides/form-cards)
- [Human hand-off](https://busymate.ai/docs/guides/human-handoff-setup)
- [Busymate AI for Microsoft Teams](https://busymate.ai/integrations/teams)

## Optional
- [llms-full.txt](https://teams.demo.busymate.ai/llms-full.txt): every page above, in full, in one request
- [agents.json](https://teams.demo.busymate.ai/agents.json): the agents.json v0.1.0 tool-actions manifest (agentsjson.org)
- [.well-known/agents.json](https://teams.demo.busymate.ai/.well-known/agents.json): this site's own machine-readable card (name/url/tools/identity/human hand-off)
- [webmcp-catalog.json](https://teams.demo.busymate.ai/webmcp-catalog.json): the page tools, readable without running the page
- [openapi.json](https://teams.demo.busymate.ai/openapi.json): the same tools as a real OpenAPI document
- [sitemap.xml](https://teams.demo.busymate.ai/sitemap.xml): every page with an honest last-modified date
- [MCP endpoint](https://teams.demo.busymate.ai/mcp): JSON-RPC 2.0 over HTTPS, the catalogue and policies open to anyone

## Sitemap
Every page on this site, as Markdown headings and links, no HTML required: [sitemap.md](https://teams.demo.busymate.ai/sitemap.md)