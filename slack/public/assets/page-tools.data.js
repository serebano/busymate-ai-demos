// sites/slack/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext
// (see the inline script at the bottom of index.html) — kept here too, as
// plain data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. Both
// are generated from backend/tool-schema.mjs (node sites/slack/build.mjs),
// so the page, the catalog and the MCP server cannot disagree.
export const TOOL_SPECS = [
  {
    "name": "service_hours",
    "description": "Patchwell's helpdesk hours, the on-call cover outside them, and the response-time targets for each priority (P1/P2/P3).",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "list_services",
    "description": "The full Patchwell service catalogue — every kind of IT request a team can raise (onboarding, access, devices, network, security, licences) with its code, plan availability and turnaround.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "search_help",
    "description": "Search Patchwell's help articles by keyword — how to reset MFA, join the VPN, get a loaner laptop, add a SaaS seat, and so on. Returns the matching articles with their steps.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "A keyword or short phrase, e.g. 'vpn', 'mfa reset' or 'loaner laptop'."
        }
      },
      "required": [
        "query"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "system_status",
    "description": "Live status of the systems Patchwell manages for its customers — SSO, Wi-Fi, VPN, email, device management and the Slack helpdesk itself — plus any open incident.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "open_ticket",
    "description": "Do NOT call this to ask the person for the category, summary, urgency, name or email — calling it with whatever is already known IS how the ticket form opens, never a chat question for a missing field. Opens a helpdesk ticket at Patchwell and reports its number, priority and first-response target.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "category": {
          "type": "string",
          "description": "The service code or category, e.g. 'device', 'access', 'network', 'email', 'other'. Leave blank if not yet known — the form lets the person pick."
        },
        "summary": {
          "type": "string",
          "description": "One line describing the problem."
        },
        "urgency": {
          "type": "string",
          "description": "'blocked' (cannot work), 'degraded' (working around it) or 'whenever' (no rush)."
        },
        "name": {
          "type": "string",
          "description": "Who the ticket is for."
        },
        "email": {
          "type": "string",
          "description": "Work email the updates go to."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false
    }
  },
  {
    "name": "request_access",
    "description": "Do NOT call this to ask the person which app, which role, their name, email or reason — calling it with whatever is already known IS how the access-request form opens. Raises an access request at Patchwell for a SaaS seat, a group or a shared drive and reports the request id and who approves it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "app": {
          "type": "string",
          "description": "The app, group or drive, e.g. 'Notion', 'GitHub', 'Finance shared drive'. Leave blank if not yet known — the form lets the person pick."
        },
        "role": {
          "type": "string",
          "description": "The level wanted: 'member', 'admin' or 'viewer'."
        },
        "name": {
          "type": "string",
          "description": "Who needs the access."
        },
        "email": {
          "type": "string",
          "description": "Their work email."
        },
        "reason": {
          "type": "string",
          "description": "One line on why — the approver reads it."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false
    }
  },
  {
    "name": "ticket_status",
    "description": "Look up one helpdesk ticket or access request at Patchwell by its number and the email it was raised under. Do NOT ask for these in prose — calling this tool is how the lookup form opens.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "reference": {
          "type": "string",
          "description": "The ticket number (e.g. 'PW-2041') or access request id (e.g. 'AR-118')."
        },
        "email": {
          "type": "string",
          "description": "The work email it was raised under."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "get_my_tickets",
    "description": "Every open and recent ticket and access request belonging to the signed-in customer, with their team's plan and seat count. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "description": "The signed-in visitor's own work email."
        }
      },
      "required": [
        "email"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  }
];
