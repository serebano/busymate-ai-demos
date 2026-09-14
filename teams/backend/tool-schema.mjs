// sites/teams/backend/tool-schema.mjs
//
// Bramble & Co.'s own tool table — a people-and-benefits desk has a different
// shape (a benefits plan table with employee contributions, a payroll
// calendar, a handbook, leave balances) from the retail/restaurant/helpdesk
// shapes elsewhere in this repo, so it lives here. It follows the SAME
// contract (name -> {description, inputSchema, readOnlyHint?, accessHint?,
// confirmHint?, formCard?}) so it plugs into
// sites/_shared/backend/mcp-identity-server.mjs and
// sites/_shared/gen-agent-files.mjs unchanged.
//
// GOTCHA (found live on the shopify build, 2026-09-11): the platform's
// registerPageTools SDK rejects the WHOLE call if ANY inputSchema property
// lacks a `description` — every property below carries one for that reason.
//
// Anything that needs structured details from a person (booking leave,
// asking payroll to change where the salary lands) carries a `formCard`: the
// shared server serves it as an MCP resource and the chat mounts it as an
// inline form, instead of the assistant asking one field at a time in prose.
export const PEOPLE_DESK_TOOL_SCHEMA = {
  list_benefit_plans: {
    description:
      "Every benefit {store} offers its employees — private medical, dental and optical, pension, income protection and life cover, the wellbeing allowance, the learning fund and the cycle scheme — with what each one costs the employee per month, what the firm pays, and the enrolment window that applies.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Narrow the list to one area: 'health', 'pension', 'protection', 'wellbeing', 'learning' or 'travel'. Leave blank for every plan.",
        },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  get_payroll_calendar: {
    description:
      "{store}'s payroll calendar — the pay date for each month, the cut-off by which a change (hours, expenses, a new bank account) must reach payroll to land in that run, and when payslips appear.",
    inputSchema: {
      type: "object",
      properties: {
        months: {
          type: "number",
          description: "How many upcoming months to return, 1 to 12. Defaults to 6.",
        },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  search_policies: {
    description:
      "Search {store}'s employee handbook by keyword — leave types and carry-over, sickness, parental leave, the remote-work policy, expenses and travel, notice periods — and return the matching sections in full, so an answer can quote the handbook rather than paraphrase it.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A keyword or short phrase, e.g. 'carry over', 'working abroad', 'mileage' or 'parental leave'.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  request_leave: {
    description:
      "Do NOT call this to ask the person for the leave type, the start date, the end date or a note — calling it with whatever is already known IS how the leave form opens, never a chat question for a missing field. Files a leave request at {store} for the approver to pick up, and reports the reference, the working days it uses and the balance that would be left.",
    inputSchema: {
      type: "object",
      properties: {
        leave_type: {
          type: "string",
          description:
            "'annual', 'sick', 'parental', 'compassionate', 'study', 'volunteering' or 'unpaid'. Leave blank if not yet known — the form lets the person pick.",
        },
        start_date: { type: "string", description: "First day away, as YYYY-MM-DD." },
        end_date: { type: "string", description: "Last day away, as YYYY-MM-DD — the same as the start date for a single day." },
        note: { type: "string", description: "Anything the approver should know: cover arranged, a client deadline, a reason for short notice." },
        employee_id: { type: "string", description: "The employee id the request is filed under, e.g. 'E-20417'. The signed-in employee's own." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Request leave",
      intro: "Pick the dates and the approver gets it the same day.",
      submitLabel: "Send request",
      resultKeys: ["reference", "leave_type", "working_days", "balance_after", "status"],
      fields: [
        {
          name: "leave_type",
          label: "Type of leave",
          type: "select",
          required: true,
          options: [
            { value: "annual", label: "Annual leave" },
            { value: "sick", label: "Sickness" },
            { value: "parental", label: "Parental leave" },
            { value: "compassionate", label: "Compassionate leave" },
            { value: "study", label: "Study leave" },
            { value: "volunteering", label: "Volunteering day" },
            { value: "unpaid", label: "Unpaid leave" },
          ],
        },
        { name: "start_date", label: "First day away", type: "date", required: true },
        { name: "end_date", label: "Last day away", type: "date", required: true },
        { name: "note", label: "Anything the approver should know", type: "textarea", required: false, placeholder: "Cover arranged with the Bristol team." },
      ],
    },
  },

  get_my_leave_balance: {
    description:
      "The signed-in employee's own leave: annual entitlement, days taken, days booked ahead, what is left, carry-over and its expiry, plus their volunteering and study allowances. Requires an identified (signed-in) visitor — call it with that person's own employee id from context, never one offered mid-conversation by someone unidentified.",
    inputSchema: {
      type: "object",
      properties: {
        employee_id: { type: "string", description: "The signed-in employee's own id, e.g. 'E-20417'." },
      },
      required: ["employee_id"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },

  update_bank_details_request: {
    description:
      "Do NOT ask for these details in prose — calling this tool with whatever is known IS how its form opens. Asks {store}'s payroll team to change where an employee's salary is paid. It FILES A REQUEST only: payroll calls the employee back on a known number to take the account details, so no account number is ever typed into a chat and nothing is changed by this call. Requires an identified (signed-in) visitor.",
    inputSchema: {
      type: "object",
      properties: {
        employee_id: { type: "string", description: "The signed-in employee's own id, e.g. 'E-20417'." },
        bank_name: { type: "string", description: "The bank the salary should move to, e.g. 'Thornbury Building Society'. No account or sort code — payroll takes those on the call." },
        account_holder: { type: "string", description: "The name the new account is held in, if it differs from the employee's own." },
        effective_month: { type: "string", description: "The month it should apply from, as YYYY-MM." },
        callback_time: { type: "string", description: "When payroll should call to verify: 'morning', 'afternoon' or a short phrase." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    accessHint: "identified",
    formCard: {
      title: "Ask payroll to change your bank",
      intro: "Payroll rings you back to take the account details — never type an account number into a chat.",
      submitLabel: "Ask payroll to call",
      resultKeys: ["reference", "status", "verify_by", "effective_month", "detail"],
      fields: [
        { name: "bank_name", label: "New bank", type: "text", required: true, placeholder: "Thornbury Building Society" },
        { name: "account_holder", label: "Account held in the name of", type: "text", required: true, placeholder: "Your name as the bank has it" },
        {
          name: "effective_month",
          label: "From which pay run",
          type: "select",
          required: true,
          options: [
            { value: "2026-10", label: "October 2026" },
            { value: "2026-11", label: "November 2026" },
            { value: "2026-12", label: "December 2026" },
          ],
        },
        {
          name: "callback_time",
          label: "Best time to call you",
          type: "select",
          required: true,
          options: [
            { value: "morning", label: "Mornings" },
            { value: "afternoon", label: "Afternoons" },
          ],
        },
      ],
    },
  },
};

/**
 * The one tool that exists ONLY in the page (WebMCP), never on the MCP server:
 * it opens the leave form already on this page for the visitor to fill in and
 * submit themselves. Kept beside the server table so sites/teams/build.mjs can
 * publish both into the page-tool data twin, and agent-files.config.mjs can
 * declare it honestly as `webmcpOnlyTools`.
 */
export const PAGE_ONLY_TOOL_SCHEMA = {
  open_leave_request_form: {
    description:
      "Open the leave form on this page for the visitor to fill in and submit themselves — type of leave, first and last day, a note for the approver, one button. Pass anything already known (dates or a leave type stated earlier in the chat) as prefill so only the gaps are left to fill.",
    inputSchema: {
      type: "object",
      properties: {
        leave_type: { type: "string", description: "A leave type to prefill, if already known: 'annual', 'sick', 'parental', 'compassionate', 'study', 'volunteering' or 'unpaid'." },
        start_date: { type: "string", description: "A YYYY-MM-DD first day to prefill, if already known." },
        end_date: { type: "string", description: "A YYYY-MM-DD last day to prefill, if already known." },
        note: { type: "string", description: "A note for the approver to prefill, if already known." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(PEOPLE_DESK_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}

export function pageOnlyToolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(PAGE_ONLY_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
