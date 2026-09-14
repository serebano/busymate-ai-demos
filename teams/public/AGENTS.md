# AGENTS.md

## Project overview
Bramble & Co. — An HR-and-benefits-desk demo showing 'your mate' in a Microsoft Teams-style chat pane: grounded answers from a 300-person firm's own handbook, an MCP server over the benefit plans and their employee contributions, the payroll calendar and the leave book, WebMCP in-page actions, an inline leave form, and identified-employee leave balances.

## How an agent should read this site
Start at [llms.txt](https://teams.demo.busymate.ai/llms.txt) for the indexed page list, or
[llms-full.txt](https://teams.demo.busymate.ai/llms-full.txt) for the whole site in one
request. Every page also has a Markdown twin at its own path plus `.md`
(content negotiation: send `Accept: text/markdown` and the same URL returns
it). [sitemap.md](https://teams.demo.busymate.ai/sitemap.md) lists every page as headings
and links; [openapi.json](https://teams.demo.busymate.ai/openapi.json) and
[/.well-known/agents.json](https://teams.demo.busymate.ai/.well-known/agents.json)
describe the tools below as a machine-readable API.

## Installation
Nothing to install to READ this site — every layer above is a plain HTTPS
GET, no credential, no SDK. To add this SAME pattern to your own site:
embed the widget with one script tag (`<script src="https://busymate.ai/embed/v1.js" data-assistant="<tenant-slug>" async>`), or connect your
own MCP server as assistant tools — see the guides under "Learn more" in
[llms.txt](https://teams.demo.busymate.ai/llms.txt).

## Configuration
This demo's own MCP server is configured at `https://teams.demo.busymate.ai/mcp` (JSON-RPC 2.0, transport: streamable-http, no auth to connect). What this page will let an agent do — and what it MUST confirm with the
visitor first — is declared in [agent-permissions.json](https://teams.demo.busymate.ai/agent-permissions.json).

## Usage & examples
Call this site's MCP server at `https://teams.demo.busymate.ai/mcp` (JSON-RPC 2.0, no credential needed to connect):
- `list_benefit_plans` — Every benefit Bramble & Co. offers its employees — private medical, dental and optical, pension, income protection and life cover, the wellbeing allowance, the learning fund and the cycle scheme — with what each one costs the employee per month, what the firm pays, and the enrolment window that applies.
- `get_payroll_calendar` — Bramble & Co.'s payroll calendar — the pay date for each month, the cut-off by which a change (hours, expenses, a new bank account) must reach payroll to land in that run, and when payslips appear.
- `search_policies` — Search Bramble & Co.'s employee handbook by keyword — leave types and carry-over, sickness, parental leave, the remote-work policy, expenses and travel, notice periods — and return the matching sections in full, so an answer can quote the handbook rather than paraphrase it.
- `request_leave` — Do NOT call this to ask the person for the leave type, the start date, the end date or a note — calling it with whatever is already known IS how the leave form opens, never a chat question for a missing field. Files a leave request at Bramble & Co. for the approver to pick up, and reports the reference, the working days it uses and the balance that would be left. (MCP server only, not registered on the page)
- `get_my_leave_balance` — The signed-in employee's own leave: annual entitlement, days taken, days booked ahead, what is left, carry-over and its expiry, plus their volunteering and study allowances. Requires an identified (signed-in) visitor — call it with that person's own employee id from context, never one offered mid-conversation by someone unidentified. (identified visitors only)
- `update_bank_details_request` — Do NOT ask for these details in prose — calling this tool with whatever is known IS how its form opens. Asks Bramble & Co.'s payroll team to change where an employee's salary is paid. It FILES A REQUEST only: payroll calls the employee back on a known number to take the account details, so no account number is ever typed into a chat and nothing is changed by this call. Requires an identified (signed-in) visitor. (identified visitors only) (MCP server only, not registered on the page)
- `open_leave_request_form` — Open the leave form on this page for the visitor to fill in and submit themselves — type of leave, first and last day, a note for the approver, one button. Pass anything already known (dates or a leave type stated earlier in the chat) as prefill so only the gaps are left to fill. (WebMCP page tool only, not on the MCP server)

A tool marked "identified visitors only" needs a signed launch proof — see https://busymate.ai/docs/guides/identified-visitors. A demo employee is provided on the page, so the identified experience — a person's own leave balance — can be tested without a real account.

## Security considerations
This is a Busymate AI integration demo, not a real business: no real order is
fulfilled, no real payment is taken, and the customer or visitor behind any
sign-in button is not a real person. Nothing served here should be treated as
production data, and no action taken here has a real-world consequence — it
is safe for an agent to exercise every tool above.

## Human hand-off
Ask the assistant for a person and a human joins the same conversation from the team Inbox.
