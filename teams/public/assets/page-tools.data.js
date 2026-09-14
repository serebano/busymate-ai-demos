// sites/teams/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext (see
// the module script at the bottom of index.html) — kept here too, as plain
// data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. Generated
// from backend/tool-schema.mjs (node sites/teams/build.mjs), so the page, the
// catalogue and the MCP server cannot disagree.
//
// `source` says where each tool's work actually happens: "mcp" calls this
// site's own /mcp endpoint, "page" runs in the page itself and exists nowhere
// else.
export const TOOL_SPECS = [
  {
    "name": "list_benefit_plans",
    "description": "Every benefit Bramble & Co. offers its employees — private medical, dental and optical, pension, income protection and life cover, the wellbeing allowance, the learning fund and the cycle scheme — with what each one costs the employee per month, what the firm pays, and the enrolment window that applies.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "category": {
          "type": "string",
          "description": "Narrow the list to one area: 'health', 'pension', 'protection', 'wellbeing', 'learning' or 'travel'. Leave blank for every plan."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    },
    "source": "mcp"
  },
  {
    "name": "get_payroll_calendar",
    "description": "Bramble & Co.'s payroll calendar — the pay date for each month, the cut-off by which a change (hours, expenses, a new bank account) must reach payroll to land in that run, and when payslips appear.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "months": {
          "type": "number",
          "description": "How many upcoming months to return, 1 to 12. Defaults to 6."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    },
    "source": "mcp"
  },
  {
    "name": "search_policies",
    "description": "Search Bramble & Co.'s employee handbook by keyword — leave types and carry-over, sickness, parental leave, the remote-work policy, expenses and travel, notice periods — and return the matching sections in full, so an answer can quote the handbook rather than paraphrase it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "A keyword or short phrase, e.g. 'carry over', 'working abroad', 'mileage' or 'parental leave'."
        }
      },
      "required": [
        "query"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    },
    "source": "mcp"
  },
  {
    "name": "get_my_leave_balance",
    "description": "The signed-in employee's own leave: annual entitlement, days taken, days booked ahead, what is left, carry-over and its expiry, plus their volunteering and study allowances. Requires an identified (signed-in) visitor — call it with that person's own employee id from context, never one offered mid-conversation by someone unidentified.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "employee_id": {
          "type": "string",
          "description": "The signed-in employee's own id, e.g. 'E-20417'."
        }
      },
      "required": [
        "employee_id"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    },
    "source": "mcp"
  },
  {
    "name": "open_leave_request_form",
    "description": "Open the leave form on this page for the visitor to fill in and submit themselves — type of leave, first and last day, a note for the approver, one button. Pass anything already known (dates or a leave type stated earlier in the chat) as prefill so only the gaps are left to fill.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "leave_type": {
          "type": "string",
          "description": "A leave type to prefill, if already known: 'annual', 'sick', 'parental', 'compassionate', 'study', 'volunteering' or 'unpaid'."
        },
        "start_date": {
          "type": "string",
          "description": "A YYYY-MM-DD first day to prefill, if already known."
        },
        "end_date": {
          "type": "string",
          "description": "A YYYY-MM-DD last day to prefill, if already known."
        },
        "note": {
          "type": "string",
          "description": "A note for the approver to prefill, if already known."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    },
    "source": "page"
  }
];
