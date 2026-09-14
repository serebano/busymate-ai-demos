// sites/teams/backend/index.mjs — Bramble & Co.'s handbook, benefits table,
// payroll calendar and leave book, plugged into the shared identity +
// generic-MCP server (sites/_shared/backend/mcp-identity-server.mjs takes NO
// HR assumptions — this file owns the people-desk shape and the handlers).
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./tool-schema.mjs";

const PORT = Number(process.env.PORT || 8108);
const ISSUER = process.env.ISSUER || "https://teams.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing
// The container mounts a persistent key volume at /keys and the docroot's
// .well-known at /wellknown; both stay overridable so the server can be run
// once locally, against a scratch directory, before anything is committed.
const KEY_DIR = process.env.KEY_DIR || "/keys";
const WELLKNOWN_DIR = process.env.WELLKNOWN_DIR || "/wellknown";

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const STORE_NAME = "Bramble & Co.";
const CURRENCY = "GBP";

// ── The handbook ────────────────────────────────────────────────────────────
// Every section search_policies can return, in the firm's own words. Short
// enough to quote whole, so an answer cites the handbook rather than a
// paraphrase of it.
const HANDBOOK = [
  {
    slug: "annual-leave",
    title: "Annual leave and carry-over",
    tags: ["annual", "holiday", "leave", "carry", "carry-over", "accrual", "entitlement", "days", "booking"],
    body: "Everyone at Bramble & Co. gets 27 days of annual leave a year plus the 8 public holidays, pro-rata for part-time contracts. Leave accrues at 2.25 days a month and the leave year runs 1 January to 31 December. Up to 5 unused days carry into the next year and must be taken by 31 March, after which they lapse. Requests go through the people desk and the approver has 2 working days to answer; anything longer than 10 consecutive working days needs 4 weeks' notice so cover can be arranged. Nobody is asked to cancel booked leave except in a declared client emergency, and leave cancelled that way is reinstated plus a day.",
  },
  {
    slug: "sickness",
    title: "Sickness and fit notes",
    tags: ["sick", "sickness", "ill", "illness", "fit note", "doctor", "absence"],
    body: "Tell your manager and the people desk as early as you can on the first day. The first 7 calendar days are self-certified — no note needed. From day 8 a fit note from a doctor is required, sent to the people desk, not to your team. Sick pay runs at full pay for 13 weeks and half pay for a further 13 weeks in any rolling 12 months. Medical appointments that cannot be taken outside working hours are not deducted from annual leave. Nothing about a health matter is shared with your team without your say-so.",
  },
  {
    slug: "parental-leave",
    title: "Parental leave",
    tags: ["parental", "maternity", "paternity", "adoption", "baby", "birth", "primary carer", "shared"],
    body: "The primary carer takes 26 weeks at full pay followed by up to 13 weeks at the statutory rate; the second carer takes 8 weeks at full pay, which can be split into two blocks in the first year. Adoption and surrogacy are treated identically from the date of placement. Tell the people desk at least 15 weeks before the due or placement date so pay and cover can be set up, and expect a keeping-in-touch call at a rhythm you choose, not one imposed. Returners come back to the same role, and to a phased four-day first month at full pay. Shared parental leave is available on request and is worked out case by case with payroll.",
  },
  {
    slug: "remote-work",
    title: "Where people work",
    tags: ["remote", "hybrid", "office", "home", "abroad", "working abroad", "anchor", "desk", "allowance"],
    body: "Bramble & Co. is hybrid with two anchor days, Tuesday and Thursday, in the Bristol or Leeds office; the rest is yours to arrange with your team. Client work overrides the anchor days whenever a client needs you on site. You may work from abroad for up to 20 working days a year, in a country on the approved list, with 3 weeks' notice so tax and insurance can be checked — the list is on the people desk and changes rarely. A home-setup allowance of £350 is available every 3 years for a chair, a desk or a monitor, claimed as an expense with a receipt.",
  },
  {
    slug: "expenses",
    title: "Expenses, travel and mileage",
    tags: ["expenses", "expense", "travel", "mileage", "receipt", "claim", "meal", "hotel", "rail", "software"],
    body: "Claim within 60 days of the spend, with a receipt for anything over £10. Claims that reach payroll by the 12th are paid with that month's salary. Rail travel is standard class; first class needs a partner's approval in advance and is normally only agreed for a journey over 3 hours with client work on the train. Mileage in your own car is 45p a mile for the first 10,000 miles in a year and 25p after that. An overnight stay carries a £30 daily meal allowance without receipts, or actual cost with them, whichever you prefer — not both. Software or a subscription under £100 needs your manager only; over that, the operations team buys it centrally.",
  },
  {
    slug: "benefits-enrolment",
    title: "Benefits enrolment windows",
    tags: ["enrol", "enrolment", "benefits", "window", "open enrolment", "joiner", "life event", "change"],
    body: "Open enrolment runs 1 to 21 October each year and changes take effect on 1 November. A new joiner has 30 days from their start date to choose, and cover starts on the first of the following month. Outside those windows a qualifying life event — a marriage or civil partnership, a birth or adoption, a partner losing their own cover, a move abroad — lets you change your choices within 60 days of the event. Anything not changed simply rolls over at the new year's rates.",
  },
  {
    slug: "pay-and-progression",
    title: "Pay, progression and payslips",
    tags: ["pay", "salary", "payslip", "review", "promotion", "raise", "bonus", "payroll", "bank"],
    body: "Salaries are paid monthly on the 26th, or the last working day before when the 26th falls on a weekend or public holiday. Payslips appear in the people portal two working days before pay day. Pay is reviewed once a year in March, effective from the April run, and a promotion can be made at any point in the year on a partner's recommendation. The firm's profit share is paid with the July salary when the year allows it. To change where your salary is paid, ask the people desk for a payroll callback — payroll rings you on a number already on file and takes the account details on the call, never in writing.",
  },
  {
    slug: "other-leave",
    title: "Compassionate, study, volunteering and unpaid leave",
    tags: ["compassionate", "bereavement", "study", "exam", "volunteering", "unpaid", "sabbatical", "learning"],
    body: "Compassionate leave is 5 paid days for the loss of someone close, extended by agreement and never argued over. Study leave is 5 paid days a year for an accredited qualification, plus the exam days themselves. Everyone has 2 paid volunteering days a year. Unpaid leave is at your manager's discretion, and after 4 years you may apply for an unpaid sabbatical of up to 3 months with your role held open.",
  },
  {
    slug: "raising-something",
    title: "Raising something with a person",
    tags: ["grievance", "complaint", "person", "human", "confidential", "harassment", "dispute", "help"],
    body: "Anything personal, contested or sensitive — a pay dispute, a grievance, harassment, a health matter, a referral to occupational health — goes to a person, not to a chat window. Ask the people desk for a human and the conversation moves to a named people partner the same day, in confidence, and nothing about it is visible to your team.",
  },
];

// ── Benefits, with what an employee actually pays ────────────────────────────
const BENEFIT_PLANS = [
  {
    code: "BR-HEA-E", name: "Health Essentials", category: "health",
    covers: "Private medical cover for you: consultations, diagnostics, in-patient and day-patient treatment, a 24-hour nurse line.",
    employeeMonthly: 0, firmMonthly: 64, note: "Everyone is enrolled automatically from their first month. No excess.",
  },
  {
    code: "BR-HEA-P", name: "Health Plus (partner or family)", category: "health",
    covers: "Everything in Health Essentials, extended to a partner, or to a partner and children, plus outpatient mental-health cover with no session cap.",
    employeeMonthly: 42, firmMonthly: 64, note: "£42 a month adds a partner; £78 a month covers a whole family. Chosen in the enrolment window.",
  },
  {
    code: "BR-DEN", name: "Dental & Optical", category: "health",
    covers: "Two check-ups and a hygienist visit a year, £450 of treatment, an eye test and £120 towards glasses used at a screen.",
    employeeMonthly: 9, firmMonthly: 11, note: "Claims are reimbursed within 10 working days.",
  },
  {
    code: "BR-PEN", name: "Pension", category: "pension",
    covers: "A workplace pension with salary sacrifice. You put in 5% by default and the firm adds 6%; raise yours to 8% and the firm matches to 8%.",
    employeeMonthly: null, firmMonthly: null, note: "Contributions are a percentage of salary, not a flat fee — 5% and 6% of pay at the default setting. Change it in any month before the 12th.",
  },
  {
    code: "BR-INC", name: "Income protection & life cover", category: "protection",
    covers: "75% of salary if you cannot work for more than 13 weeks, until you return or retire, plus life cover of 4x salary.",
    employeeMonthly: 0, firmMonthly: 38, note: "Paid entirely by the firm, everyone covered, no medical questions under 45.",
  },
  {
    code: "BR-WEL", name: "Wellbeing allowance", category: "wellbeing",
    covers: "£40 a month towards anything that keeps you well — a gym, a class, a therapist, a bike service, a pair of running shoes.",
    employeeMonthly: 0, firmMonthly: 40, note: "Claimed as an expense; unused months do not roll over.",
  },
  {
    code: "BR-LRN", name: "Learning fund", category: "learning",
    covers: "£1,200 a year for a course, a conference or a qualification, with 5 study days and the exam days on top.",
    employeeMonthly: 0, firmMonthly: 100, note: "Agreed with your manager before you book; the fund resets each January.",
  },
  {
    code: "BR-CYC", name: "Cycle to work", category: "travel",
    covers: "A bike and kit up to £2,500 through salary sacrifice, spread over 12 or 24 months.",
    employeeMonthly: null, firmMonthly: 0, note: "The monthly amount depends on the bike; the saving is the tax and national insurance on it. Open all year, not only in the enrolment window.",
  },
];

const ENROLMENT = {
  openEnrolment: "1 to 21 October each year, effective 1 November",
  newJoiners: "30 days from your start date; cover begins on the first of the following month",
  lifeEvents: "A marriage or civil partnership, a birth or adoption, a partner losing cover, or a move abroad lets you change within 60 days",
};

// ── The payroll calendar ─────────────────────────────────────────────────────
// Derived from the rule rather than typed out, so the demo cannot drift into
// quoting a pay date that has already passed.
const PUBLIC_HOLIDAYS = new Set([
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
]);
const iso = (d) => d.toISOString().slice(0, 10);
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const isWorkingDay = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !PUBLIC_HOLIDAYS.has(iso(d));

/** The given day, or the last working day before it. */
function backToWorkingDay(date) {
  const d = new Date(date.getTime());
  while (!isWorkingDay(d)) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function payrollMonths(count) {
  const out = [];
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  for (let i = 0; i < count; i += 1) {
    const pay = backToWorkingDay(new Date(Date.UTC(year, month, 26)));
    const cutoff = backToWorkingDay(new Date(Date.UTC(year, month, 12)));
    const payslip = new Date(pay.getTime());
    for (let back = 0; back < 2;) {
      payslip.setUTCDate(payslip.getUTCDate() - 1);
      if (isWorkingDay(payslip)) back += 1;
    }
    out.push({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      month_name: `${MONTH_NAME[month]} ${year}`,
      pay_date: iso(pay),
      pay_weekday: WEEKDAY[pay.getUTCDay()],
      changes_cutoff: iso(cutoff),
      payslip_available: iso(payslip),
    });
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return out;
}

// ── The demo employee ────────────────────────────────────────────────────────
const demoCustomer = {
  id: "E-20417",
  name: "Priya Nair",
  email: "priya@example.com",
  team: "Advisory, Bristol",
  startedOn: "2023-04-17",
};

// In-memory leave book, seeded so get_my_leave_balance and the leave form have
// something real to work against from the first turn. request_leave appends to
// it and it resets when the container restarts — a public demo, not a payroll
// system.
const LEAVE_BALANCE = {
  leave_year: "2026",
  entitlement_days: 27,
  public_holidays: 8,
  carried_over_days: 4,
  carry_over_expires: "2027-03-31",
  taken_days: 12.5,
  booked_ahead_days: 5,
  volunteering_days: { allowance: 2, used: 1 },
  study_days: { allowance: 5, used: 2 },
  learning_fund: { allowance_gbp: 1200, used_gbp: 340 },
};
const leaveRequests = [
  { reference: "BR-LV-3081", employeeId: demoCustomer.id, leaveType: "annual", start: "2026-10-19", end: "2026-10-23", workingDays: 5, status: "approved", approver: "Dilan Osei (Advisory lead)", filed: "2026-08-14", note: "Half-term; cover agreed with the Bristol team." },
  { reference: "BR-LV-2944", employeeId: demoCustomer.id, leaveType: "volunteering", start: "2026-06-11", end: "2026-06-11", workingDays: 1, status: "taken", approver: "Dilan Osei (Advisory lead)", filed: "2026-05-28", note: null },
];
let leaveSeq = 3082;
const bankRequests = [];
let bankSeq = 611;

const LEAVE_TYPES = new Set(["annual", "sick", "parental", "compassionate", "study", "volunteering", "unpaid"]);

function workingDaysBetween(startStr, endStr) {
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;
  let days = 0;
  for (const d = new Date(start.getTime()); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (isWorkingDay(d)) days += 1;
  }
  return days;
}

const remainingDays = () =>
  Math.round((LEAVE_BALANCE.entitlement_days + LEAVE_BALANCE.carried_over_days
    - LEAVE_BALANCE.taken_days - LEAVE_BALANCE.booked_ahead_days) * 100) / 100;

const HANDLERS = {
  list_benefit_plans: ({ category }) => {
    const want = String(category || "").toLowerCase().trim();
    const plans = want ? BENEFIT_PLANS.filter((p) => p.category === want) : BENEFIT_PLANS;
    return {
      currency: CURRENCY,
      contribution_note: "Employee contributions are per month and come out of gross pay by salary sacrifice, so the cost after tax is lower than the figure shown.",
      plans,
      enrolment: ENROLMENT,
      ...(want && plans.length === 0
        ? { note: "No plan in that area — the areas are health, pension, protection, wellbeing, learning and travel." }
        : {}),
    };
  },

  get_payroll_calendar: ({ months }) => {
    const count = Math.min(Math.max(Number(months) || 6, 1), 12);
    return {
      rule: "Salaries are paid on the 26th of the month, or the last working day before it when the 26th is a weekend or a public holiday.",
      changes_cutoff_rule: "Anything that changes a payslip — hours, expenses, a benefit choice, a new bank account — must be with payroll by the 12th to land in that month's run.",
      months: payrollMonths(count),
    };
  },

  search_policies: ({ query }) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return { sections: HANDBOOK };
    const words = q.split(/\s+/).filter(Boolean);
    const hits = HANDBOOK.filter((section) =>
      words.some((w) =>
        section.title.toLowerCase().includes(w)
        || section.tags.some((t) => t.includes(w) || w.includes(t))
        || section.body.toLowerCase().includes(w)));
    return {
      sections: hits,
      ...(hits.length ? {} : { note: "Nothing in the handbook matches that. Say what you are trying to do and I can point you at the right section, or bring in a people partner." }),
    };
  },

  request_leave: ({ leave_type, start_date, end_date, note, employee_id }) => {
    if (!leave_type || !start_date || !end_date) {
      return { error: "missing_details", detail: "A type of leave, a first day and a last day are all needed before a request can go to the approver." };
    }
    const type = String(leave_type).toLowerCase();
    if (!LEAVE_TYPES.has(type)) {
      return { error: "unknown_leave_type", detail: "The leave types are annual, sick, parental, compassionate, study, volunteering and unpaid." };
    }
    const days = workingDaysBetween(start_date, end_date);
    if (days === null) return { error: "bad_dates", detail: "Those dates do not read as a first day and a last day, in that order." };
    if (days === 0) return { error: "no_working_days", detail: "That range is all weekend and public holidays, so there is nothing to book." };
    const balanceAfter = type === "annual" ? Math.round((remainingDays() - days) * 100) / 100 : null;
    if (type === "annual" && balanceAfter < 0) {
      return { error: "not_enough_days", detail: `That is ${days} working days and only ${remainingDays()} are left this leave year.`, days_left: remainingDays() };
    }
    const reference = `BR-LV-${leaveSeq++}`;
    leaveRequests.push({
      reference, employeeId: employee_id || demoCustomer.id, leaveType: type,
      start: start_date, end: end_date, workingDays: days, status: "waiting for approval",
      approver: "Dilan Osei (Advisory lead)", filed: new Date().toISOString().slice(0, 10), note: note || null,
    });
    if (type === "annual") LEAVE_BALANCE.booked_ahead_days += days;
    return {
      reference, leave_type: type, working_days: days, status: "waiting for approval",
      approver: "Dilan Osei (Advisory lead)",
      balance_after: balanceAfter,
      detail: "Bramble & Co. is a demonstration firm, so no approver is actually asked and no leave is really booked.",
    };
  },

  get_my_leave_balance: ({ employee_id }) => {
    const id = String(employee_id || "").toUpperCase().trim();
    if (id !== demoCustomer.id) {
      return { error: "not_this_employee", detail: "Leave balances are only ever shown to the person they belong to." };
    }
    return {
      employee: { id: demoCustomer.id, name: demoCustomer.name, team: demoCustomer.team, started_on: demoCustomer.startedOn },
      ...LEAVE_BALANCE,
      remaining_days: remainingDays(),
      requests: leaveRequests.filter((r) => r.employeeId === demoCustomer.id),
    };
  },

  update_bank_details_request: ({ employee_id, bank_name, account_holder, effective_month, callback_time }) => {
    if (!bank_name || !account_holder || !effective_month) {
      return { error: "missing_details", detail: "The new bank, the name the account is held in and the pay run it should start from are all needed before payroll can call." };
    }
    if (!/^\d{4}-\d{2}$/.test(String(effective_month))) {
      return { error: "bad_month", detail: "The pay run should read as a month, e.g. 2026-11." };
    }
    const reference = `BR-PY-${bankSeq++}`;
    bankRequests.push({ reference, employeeId: employee_id || demoCustomer.id, bankName: bank_name, accountHolder: account_holder, effectiveMonth: effective_month, callbackTime: callback_time || "morning" });
    const cutoff = payrollMonths(12).find((m) => m.month === effective_month)?.changes_cutoff ?? null;
    return {
      reference, status: "waiting for payroll to verify",
      verify_by: `A payroll caller rings the number already on file, ${callback_time === "afternoon" ? "in the afternoon" : "in the morning"}, within one working day`,
      effective_month, changes_cutoff: cutoff,
      detail: "Nothing has been changed: this files a request, and no account number is ever taken in a chat. Bramble & Co. is a demonstration firm, so payroll will not really call.",
    };
  },
};

const SCHEMA = toolsFor(STORE_NAME);
const tools = Object.fromEntries(Object.entries(SCHEMA).map(([name, def]) => [name, { ...def, handler: HANDLERS[name] }]));

start({
  port: PORT,
  issuer: ISSUER,
  tenantId: TENANT_ID,
  keyDir: KEY_DIR,
  wellKnownDir: WELLKNOWN_DIR,
  demoCustomer,
  tools,
  storeName: STORE_NAME,
  namespace: "bramble",
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical (the
  // tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demo-teams" (sites/teams/demo.json `assistant`).
  hostedOrigins: ["https://demo-teams.busymate.ai", "https://busymate.ai"],
});
