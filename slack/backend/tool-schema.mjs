// sites/slack/backend/tool-schema.mjs
//
// Patchwell's own tool table — an IT-helpdesk SaaS has a different shape
// (a service catalogue, tickets, access requests, a status board) from the
// retail/restaurant shapes elsewhere in this repo, so it lives here. It
// follows the SAME contract (name -> {description, inputSchema,
// readOnlyHint?, accessHint?, confirmHint?, formCard?}) so it plugs into
// sites/_shared/backend/mcp-identity-server.mjs and
// sites/_shared/gen-agent-files.mjs unchanged.
//
// GOTCHA (found live on the shopify build, 2026-09-11): the platform's
// registerPageTools SDK rejects the WHOLE call if ANY inputSchema property
// lacks a `description` — every property below carries one for that reason.
//
// Anything that needs structured details from a person (opening a ticket,
// requesting access, checking a ticket) carries a `formCard` — the shared
// server serves it as an MCP resource and the chat mounts it as an inline
// form instead of the assistant asking one field at a time in prose.
export const HELPDESK_TOOL_SCHEMA = {
  service_hours: {
    description: "{store}'s helpdesk hours, the on-call cover outside them, and the response-time targets for each priority (P1/P2/P3).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  list_services: {
    description: "The full {store} service catalogue — every kind of IT request a team can raise (onboarding, access, devices, network, security, licences) with its code, plan availability and turnaround.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  search_help: {
    description: "Search {store}'s help articles by keyword — how to reset MFA, join the VPN, get a loaner laptop, add a SaaS seat, and so on. Returns the matching articles with their steps.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A keyword or short phrase, e.g. 'vpn', 'mfa reset' or 'loaner laptop'." } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  system_status: {
    description: "Live status of the systems {store} manages for its customers — SSO, Wi-Fi, VPN, email, device management and the Slack helpdesk itself — plus any open incident.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  open_ticket: {
    description: "Do NOT call this to ask the person for the category, summary, urgency, name or email — calling it with whatever is already known IS how the ticket form opens, never a chat question for a missing field. Opens a helpdesk ticket at {store} and reports its number, priority and first-response target.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "The service code or category, e.g. 'device', 'access', 'network', 'email', 'other'. Leave blank if not yet known — the form lets the person pick." },
        summary: { type: "string", description: "One line describing the problem." },
        urgency: { type: "string", description: "'blocked' (cannot work), 'degraded' (working around it) or 'whenever' (no rush)." },
        name: { type: "string", description: "Who the ticket is for." },
        email: { type: "string", description: "Work email the updates go to." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Open a ticket",
      intro: "Tell the desk what's wrong and how urgent it is.",
      submitLabel: "Open ticket",
      resultKeys: ["ticket_number", "priority", "first_response_by", "status"],
      fields: [
        { name: "category", label: "What is it about", type: "select", required: true,
          options: [
            { value: "device", label: "A laptop, phone or peripheral" },
            { value: "access", label: "Access to an app, group or drive" },
            { value: "network", label: "Wi-Fi, VPN or connectivity" },
            { value: "email", label: "Email or calendar" },
            { value: "security", label: "Security, MFA or a suspicious message" },
            { value: "other", label: "Something else" },
          ] },
        { name: "summary", label: "What's wrong", type: "textarea", required: true, placeholder: "My laptop drops off the office Wi-Fi every few minutes…" },
        { name: "urgency", label: "How urgent", type: "select", required: true,
          options: [
            { value: "blocked", label: "I can't work until it's fixed" },
            { value: "degraded", label: "I'm working around it" },
            { value: "whenever", label: "No rush" },
          ] },
        { name: "name", label: "Your name", type: "text", required: true, placeholder: "Maya Okafor" },
        { name: "email", label: "Work email", type: "email", required: true, placeholder: "you@yourcompany.com" },
      ],
    },
  },

  request_access: {
    description: "Do NOT call this to ask the person which app, which role, their name, email or reason — calling it with whatever is already known IS how the access-request form opens. Raises an access request at {store} for a SaaS seat, a group or a shared drive and reports the request id and who approves it.",
    inputSchema: {
      type: "object",
      properties: {
        app: { type: "string", description: "The app, group or drive, e.g. 'Notion', 'GitHub', 'Finance shared drive'. Leave blank if not yet known — the form lets the person pick." },
        role: { type: "string", description: "The level wanted: 'member', 'admin' or 'viewer'." },
        name: { type: "string", description: "Who needs the access." },
        email: { type: "string", description: "Their work email." },
        reason: { type: "string", description: "One line on why — the approver reads it." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Request access",
      intro: "Say what you need and the approver gets it in Slack.",
      submitLabel: "Send request",
      resultKeys: ["request_id", "approver", "status", "expected_by"],
      fields: [
        { name: "app", label: "App, group or drive", type: "select", required: true,
          options: [
            { value: "Notion", label: "Notion" },
            { value: "GitHub", label: "GitHub" },
            { value: "Figma", label: "Figma" },
            { value: "Google Workspace group", label: "A Google Workspace group" },
            { value: "Finance shared drive", label: "Finance shared drive" },
            { value: "Production VPN", label: "Production VPN" },
          ] },
        { name: "role", label: "Level", type: "select", required: true,
          options: [
            { value: "viewer", label: "Viewer" },
            { value: "member", label: "Member" },
            { value: "admin", label: "Admin" },
          ] },
        { name: "name", label: "Your name", type: "text", required: true, placeholder: "Maya Okafor" },
        { name: "email", label: "Work email", type: "email", required: true, placeholder: "you@yourcompany.com" },
        { name: "reason", label: "Why", type: "textarea", required: true, placeholder: "Joining the launch project, need to edit the roadmap." },
      ],
    },
  },

  ticket_status: {
    description: "Look up one helpdesk ticket or access request at {store} by its number and the email it was raised under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.",
    inputSchema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "The ticket number (e.g. 'PW-2041') or access request id (e.g. 'AR-118')." },
        email: { type: "string", description: "The work email it was raised under." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
    formCard: {
      title: "Check a ticket",
      intro: "Which ticket or access request should I look up?",
      submitLabel: "Check it",
      resultKeys: ["kind", "status", "summary", "engineer", "last_update", "next_step"],
      fields: [
        { name: "reference", label: "Ticket or request number", type: "text", required: true, placeholder: "PW-2041 or AR-118" },
        { name: "email", label: "Email it was raised under", type: "email", required: true, placeholder: "you@yourcompany.com" },
      ],
    },
  },

  get_my_tickets: {
    description: "Every open and recent ticket and access request belonging to the signed-in customer, with their team's plan and seat count. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "The signed-in visitor's own work email." } },
      required: ["email"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(HELPDESK_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
