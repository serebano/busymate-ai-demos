// sites/slack/backend/index.mjs — Patchwell's data + tool handlers, plugged
// into the shared identity + generic-MCP server
// (sites/_shared/backend/mcp-identity-server.mjs takes NO helpdesk
// assumptions — this file owns the service catalogue, the ticket shapes and
// the handlers).
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./tool-schema.mjs";

const PORT = Number(process.env.PORT || 8105);
const ISSUER = process.env.ISSUER || "https://slack.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const STORE_NAME = "Patchwell";

const HOURS = {
  helpdesk: "Monday to Friday, 08:00-20:00 Central European Time, staffed by engineers in Lisbon and Tallinn.",
  onCall: "Outside those hours a P1 (a whole team blocked, or a security incident) pages the on-call engineer within 15 minutes, any day of the year. P2 and P3 wait for the next helpdesk shift.",
  targets: {
    P1: { meaning: "A whole team or a customer-facing system is down, or a security incident", firstResponse: "15 minutes", resolutionAim: "4 hours" },
    P2: { meaning: "One person cannot work, or a shared tool is degraded", firstResponse: "1 hour", resolutionAim: "1 business day" },
    P3: { meaning: "A question, a request, or something you can work around", firstResponse: "Next business day", resolutionAim: "3 business days" },
  },
};

const SERVICES = [
  { code: "PW-ONB", name: "Onboarding & offboarding", area: "People", plans: ["Starter", "Team", "Scale"], turnaround: "Laptop shipped and accounts live before day one; every account closed within 1 hour of an offboarding", description: "Tell Patch a start date and a role. The laptop is enrolled, shipped and waiting; SSO, email, Slack and the role's apps are provisioned from a template." },
  { code: "PW-ACC", name: "Access requests", area: "Accounts", plans: ["Starter", "Team", "Scale"], turnaround: "Approved requests granted within 15 minutes, most approvals inside an hour", description: "SaaS seats, Google groups, shared drives and VPN profiles, requested in Slack and routed to the right approver with a one-tap approve." },
  { code: "PW-DEV", name: "Device repair & loaners", area: "Devices", plans: ["Team", "Scale"], turnaround: "Loaner couriered within 24 hours in the EU and UK; repairs 3-5 business days", description: "Cracked screens, dead batteries, spilled coffee. A loaner arrives, the broken device goes to a certified repairer, your files follow you through the managed backup." },
  { code: "PW-PWD", name: "Password, MFA & lockouts", area: "Accounts", plans: ["Starter", "Team", "Scale"], turnaround: "Self-serve in seconds; verified manual resets within 15 minutes", description: "Lost your phone with the authenticator on it? Patch verifies you through your manager and re-enrols MFA without a ticket queue." },
  { code: "PW-NET", name: "Network & Wi-Fi", area: "Infrastructure", plans: ["Team", "Scale"], turnaround: "Same-day remote diagnosis; on-site visit next business day in Lisbon, Tallinn and Berlin", description: "Office Wi-Fi, guest networks, VPN, printers and the router nobody remembers the password to — managed, monitored and documented." },
  { code: "PW-SEC", name: "Security baseline", area: "Security", plans: ["Team", "Scale"], turnaround: "Enrolled fleets patched within 7 days of a vendor release; critical patches within 48 hours", description: "Disk encryption, automatic patching, MDM enrolment, phishing reporting from Slack, and a monthly posture report your auditor can read." },
  { code: "PW-LIC", name: "Licences & renewals", area: "Vendors", plans: ["Scale"], turnaround: "Renewal notices 60 days ahead; unused seats reclaimed monthly", description: "Every SaaS contract in one register, seats reconciled against who actually logs in, and renewals negotiated before they auto-renew." },
  { code: "PW-STA", name: "Status & incident updates", area: "Infrastructure", plans: ["Starter", "Team", "Scale"], turnaround: "Incident posted to your #it-help channel within 5 minutes of detection", description: "Ask Patch 'is SSO down?' and get the live answer; during an incident the channel gets updates until it's closed." },
];

const PLANS = [
  { name: "Starter", price: "$6 per person per month", seats: "up to 25 people", includes: ["Onboarding & offboarding", "Access requests", "Password, MFA & lockouts", "Status & incident updates", "Helpdesk hours cover"] },
  { name: "Team", price: "$11 per person per month", seats: "25-200 people", includes: ["Everything in Starter", "Device repair & loaners", "Network & Wi-Fi", "Security baseline", "P1 on-call any time"] },
  { name: "Scale", price: "Priced per fleet", seats: "200+ people or several offices", includes: ["Everything in Team", "Licences & renewals", "A named lead engineer", "Quarterly audit pack"] },
];

const HELP = [
  { slug: "reset-mfa", title: "Reset MFA after losing your phone", tags: ["mfa", "2fa", "authenticator", "phone", "lockout", "reset"], steps: ["Message Patch in #it-help: 'I lost my phone, need MFA reset'.", "Patch asks your manager to confirm it's you (one tap in Slack).", "You get a one-time enrolment link valid for 10 minutes.", "Enrol the new device; old factors are revoked automatically."] },
  { slug: "join-vpn", title: "Join the VPN from a new laptop", tags: ["vpn", "remote", "network", "profile"], steps: ["Open the Patchwell app in the menu bar and pick VPN.", "Sign in with SSO; your profile installs itself.", "Toggle Connect. A green dot means you're on."] },
  { slug: "loaner-laptop", title: "Get a loaner laptop", tags: ["loaner", "laptop", "broken", "repair", "device", "screen", "battery"], steps: ["Tell Patch what's broken (a photo helps).", "Confirm a delivery address; the loaner ships the same day in the EU/UK.", "Sign in with SSO on the loaner — your files restore from backup.", "Hand the broken device to the courier who brings the loaner."] },
  { slug: "add-saas-seat", title: "Add a seat in Figma, Notion or GitHub", tags: ["seat", "licence", "figma", "notion", "github", "access", "app"], steps: ["Ask Patch to request access, naming the app and the level.", "The app's owner approves in Slack.", "The invite lands in your inbox within 15 minutes of approval."] },
  { slug: "guest-wifi", title: "Give a visitor guest Wi-Fi", tags: ["wifi", "guest", "visitor", "network", "office"], steps: ["Ask Patch for a guest pass, naming the visitor and the day.", "A QR code arrives in the thread; it works for 24 hours."] },
  { slug: "report-phishing", title: "Report a suspicious email", tags: ["phishing", "security", "suspicious", "email", "scam"], steps: ["Forward the email to phish@ or paste it to Patch.", "Don't click links; the desk checks the sender and blocks it fleet-wide if it's malicious.", "You get a verdict in the thread within an hour."] },
  { slug: "offboard", title: "Offboard someone leaving", tags: ["offboarding", "leaver", "leaving", "revoke", "accounts"], steps: ["Tell Patch the person and their last day.", "On that day at 18:00 local time every account is suspended and the laptop is locked remotely.", "Their drive and mailbox transfer to the manager for 90 days."] },
  { slug: "printer", title: "Print from a laptop", tags: ["printer", "print", "office"], steps: ["Open the Patchwell app and pick Printers.", "Choose the office; the queue installs.", "If it prints blank pages, ask Patch — usually a toner swap the desk can send."] },
];

const STATUS = [
  { system: "Single sign-on", state: "operational" },
  { system: "Email & calendar", state: "operational" },
  { system: "Office Wi-Fi (Lisbon, Tallinn, Berlin)", state: "operational" },
  { system: "VPN", state: "degraded", note: "Slower than usual for some users on the Berlin gateway since 07:40 CET — an engineer is on it, no action needed." },
  { system: "Device management", state: "operational" },
  { system: "Slack helpdesk (Patch)", state: "operational" },
];

const demoCustomer = { id: "cust_demo_patchwell_01", name: "Maya Okafor", email: "maya@example.com", company: "Fernwood Studio", plan: "Team", seats: 34 };

// In-memory demo tickets + access requests. Seeded so ticket_status /
// get_my_tickets have something to show immediately; open_ticket /
// request_access append more (reset on restart — a public demo, not a real
// helpdesk).
const tickets = [
  { number: "PW-2041", customerId: demoCustomer.id, email: demoCustomer.email, name: demoCustomer.name, category: "network", summary: "Laptop drops off the office Wi-Fi every few minutes", priority: "P2", status: "in progress", engineer: "Jonas (Tallinn desk)", opened: "2026-09-11 09:12", lastUpdate: "2026-09-12 08:05 — a replacement access point is being shipped to the Lisbon office; using the 5 GHz network in the meantime is stable.", nextStep: "Access point arrives 2026-09-13; the desk will confirm in the thread." },
  { number: "PW-2017", customerId: demoCustomer.id, email: demoCustomer.email, name: demoCustomer.name, category: "access", summary: "Figma editor seat for a new designer", priority: "P3", status: "resolved", engineer: "Patch (automated)", opened: "2026-09-03 14:30", lastUpdate: "2026-09-03 14:52 — seat added, invite sent.", nextStep: "None — closed." },
];
const accessRequests = [
  { id: "AR-118", customerId: demoCustomer.id, email: demoCustomer.email, name: demoCustomer.name, app: "Notion", role: "admin", status: "waiting for approval", approver: "Priya Desai (workspace owner)", raised: "2026-09-12 07:58", expectedBy: "Today, most approvals land within an hour" },
];
let ticketSeq = 2042;
let requestSeq = 119;

function priorityFor(urgency) {
  if (urgency === "blocked") return "P2";
  if (urgency === "degraded") return "P3";
  return "P3";
}
function firstResponseFor(priority) {
  return HOURS.targets[priority]?.firstResponse ?? "Next business day";
}

const HANDLERS = {
  service_hours: () => ({ hours: HOURS.helpdesk, on_call: HOURS.onCall, response_targets: HOURS.targets }),
  list_services: () => ({ services: SERVICES, plans: PLANS }),
  search_help: ({ query }) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return { articles: HELP };
    const words = q.split(/\s+/);
    const hits = HELP.filter((a) => words.some((w) => a.title.toLowerCase().includes(w) || a.tags.some((t) => t.includes(w) || w.includes(t))));
    return { articles: hits, note: hits.length ? undefined : "No article matches that — say what you're trying to do and I'll open a ticket instead." };
  },
  system_status: () => ({
    checked_at: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    systems: STATUS,
    open_incident: STATUS.filter((s) => s.state !== "operational").map((s) => `${s.system}: ${s.state} — ${s.note}`).join("; ") || "none",
  }),
  open_ticket: ({ category, summary, urgency, name, email }) => {
    if (!category || !summary || !urgency || !name || !email) return { error: "missing_details", detail: "A category, a one-line summary, how urgent it is, a name and a work email are all needed to open a ticket." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "bad_email", detail: "That email address does not look right." };
    const priority = priorityFor(urgency);
    const number = `PW-${ticketSeq++}`;
    tickets.push({
      number, customerId: email === demoCustomer.email ? demoCustomer.id : null, email, name, category, summary, priority,
      status: "open", engineer: "unassigned", opened: new Date().toISOString().slice(0, 16).replace("T", " "),
      lastUpdate: "Just opened — an engineer picks it up next.", nextStep: `First response within ${firstResponseFor(priority)}.`,
    });
    return { ticket_number: number, priority, first_response_by: firstResponseFor(priority), status: "open", detail: "Patchwell is a demonstration helpdesk, so no engineer is actually paged." };
  },
  request_access: ({ app, role, name, email, reason }) => {
    if (!app || !role || !name || !email || !reason) return { error: "missing_details", detail: "The app, the level, a name, a work email and a one-line reason are all needed." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "bad_email", detail: "That email address does not look right." };
    const id = `AR-${requestSeq++}`;
    accessRequests.push({ id, customerId: email === demoCustomer.email ? demoCustomer.id : null, email, name, app, role, status: "waiting for approval", approver: `${app} owner`, raised: new Date().toISOString().slice(0, 16).replace("T", " "), expectedBy: "Most approvals land within an hour" });
    return { request_id: id, approver: `${app} owner`, status: "waiting for approval", expected_by: "Most approvals land within an hour", detail: "Patchwell is a demonstration helpdesk, so nobody is actually asked to approve this." };
  },
  ticket_status: ({ reference, email }) => {
    const ref = String(reference ?? "").toUpperCase().trim();
    if (!ref || !email) return { error: "missing_details", detail: "A ticket or request number and the email it was raised under are both needed." };
    const mine = String(email).toLowerCase();
    if (ref.startsWith("AR-")) {
      const r = accessRequests.find((x) => x.id === ref && x.email.toLowerCase() === mine);
      if (!r) return { error: "not_found", detail: "I can't find an access request with that id on that email." };
      return { kind: "access request", status: r.status, summary: `${r.role} on ${r.app}`, engineer: r.approver, last_update: r.raised, next_step: r.expectedBy };
    }
    const t = tickets.find((x) => x.number === ref && x.email.toLowerCase() === mine);
    if (!t) return { error: "not_found", detail: "I can't find a ticket with that number on that email." };
    return { kind: "ticket", status: t.status, summary: `${t.summary} (${t.priority})`, engineer: t.engineer, last_update: t.lastUpdate, next_step: t.nextStep };
  },
  get_my_tickets: ({ email }) => {
    const mine = String(email ?? "").toLowerCase();
    const isDemo = mine === demoCustomer.email;
    return {
      customer: isDemo ? { name: demoCustomer.name, company: demoCustomer.company, plan: demoCustomer.plan, seats: demoCustomer.seats } : null,
      tickets: tickets.filter((t) => t.email.toLowerCase() === mine),
      access_requests: accessRequests.filter((r) => r.email.toLowerCase() === mine),
    };
  },
};

const SCHEMA = toolsFor(STORE_NAME);
const tools = Object.fromEntries(Object.entries(SCHEMA).map(([name, def]) => [name, { ...def, handler: HANDLERS[name] }]));

start({
  port: PORT,
  issuer: ISSUER,
  tenantId: TENANT_ID,
  keyDir: "/keys",
  wellKnownDir: "/wellknown",
  demoCustomer,
  tools,
  storeName: STORE_NAME,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demo-slack" (sites/slack/demo.json `assistant`).
  hostedOrigins: ["https://demo-slack.busymate.ai", "https://busymate.ai"],
});
