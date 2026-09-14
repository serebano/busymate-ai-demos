// sites/whatsapp/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext
// (see the inline script at the bottom of index.html) — kept here too, as
// plain data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. If a
// tool changes on the page, change it here in the SAME commit.
export const TOOL_SPECS = [
  {
    "name": "opening_hours",
    "description": "Marlow's Kitchen's opening hours, by day of the week, including brunch/dinner service windows and any closed days.",
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
    "name": "list_menu",
    "description": "List every dish and drink Marlow's Kitchen serves, grouped by section, with prices.",
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
    "name": "search_menu",
    "description": "Search Marlow's Kitchen's menu by name, ingredient, or keyword (e.g. an allergen or 'vegetarian').",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "A dish name, ingredient, or keyword to search for, e.g. 'vegetarian' or 'short rib'."
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
    "name": "check_availability",
    "description": "Check whether Marlow's Kitchen has a table for a given date, time and party size, with nearby alternative times if that exact slot is full.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "description": "The requested date, as YYYY-MM-DD."
        },
        "time": {
          "type": "string",
          "description": "The requested time, 24-hour HH:MM, e.g. '19:30'."
        },
        "party_size": {
          "type": "number",
          "description": "Number of guests in the party."
        }
      },
      "required": [
        "date",
        "time",
        "party_size"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "book_table",
    "description": "Do NOT call this tool to ask the visitor for date, time, party size, name or phone — call open_booking_form for that instead, it is the ONLY approved way to collect a missing field, never a chat question. Book a table at Marlow's Kitchen, but ONLY once the visitor has already stated every one of those five fields themselves, in their own words, earlier in this conversation. Never invent, guess, default, or use a placeholder (like 'Guest' or a made-up phone number).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "description": "The booking date, as YYYY-MM-DD."
        },
        "time": {
          "type": "string",
          "description": "The booking time, 24-hour HH:MM, e.g. '19:30'."
        },
        "party_size": {
          "type": "number",
          "description": "Number of guests in the party."
        },
        "name": {
          "type": "string",
          "description": "Name the booking is under."
        },
        "phone": {
          "type": "string",
          "description": "A phone number to hold the booking against."
        },
        "notes": {
          "type": "string",
          "description": "Anything the kitchen or floor should know — an allergy, a seating request, an occasion."
        }
      },
      "required": [
        "date",
        "time",
        "party_size",
        "name",
        "phone"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "get_my_reservations",
    "description": "List the reservations at Marlow's Kitchen booked under a phone number. Requires an identified (signed-in) visitor.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "phone": {
          "type": "string",
          "description": "The phone number the reservation was booked under (the signed-in visitor's own)."
        }
      },
      "required": [
        "phone"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "cancel_reservation",
    "description": "Cancel a reservation at Marlow's Kitchen by its confirmation code + the phone number it was booked under.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "confirmation_code": {
          "type": "string",
          "description": "The reservation's confirmation code, as given when it was booked, e.g. 'MK-58231'."
        },
        "phone": {
          "type": "string",
          "description": "The phone number the reservation was booked under."
        }
      },
      "required": [
        "confirmation_code",
        "phone"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "open_booking_form",
    "description": "Open an inline booking form on the page for the visitor to fill in and submit themselves — name, phone, party size, date and time, one \"Book table\" button. ALWAYS call this instead of asking for those details one at a time in the conversation; pass any values already known (a date/time/party size from earlier in the chat, or a signed-in guest's own name/phone) as prefill so the visitor only fills in what's missing.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "description": "A YYYY-MM-DD date to prefill, if already known."
        },
        "time": {
          "type": "string",
          "description": "A 24-hour HH:MM time to prefill, if already known."
        },
        "party_size": {
          "type": "number",
          "description": "A party size to prefill, if already known."
        },
        "name": {
          "type": "string",
          "description": "A name to prefill, if already known (e.g. the signed-in guest's own)."
        },
        "phone": {
          "type": "string",
          "description": "A phone number to prefill, if already known (e.g. the signed-in guest's own)."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  }
];
