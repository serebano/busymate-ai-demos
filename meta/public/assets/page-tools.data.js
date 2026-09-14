// sites/meta/public/assets/page-tools.data.js
//
// The SAME tool specs registered on the page via document.modelContext
// (see the inline script at the bottom of index.html) — kept here too, as
// plain data, so scripts/gen-webmcp-catalog.mjs can publish an honest
// /webmcp-catalog.json for a reader that never executes JavaScript. If a
// tool changes on the page, change it here in the SAME commit.
export const TOOL_SPECS = [
  {
    "name": "list_collection",
    "description": "The whole Sol & Salt Swimwear collection — every swim and resort piece in stock, with its code, fabric, size range, colourways and price. Optionally narrowed to one category.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "category": {
          "type": "string",
          "description": "Narrow the list: 'swim', 'resort' or 'all' (the default)."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "search_products",
    "description": "Search the Sol & Salt Swimwear collection by name, code, fabric, colourway or a word for what it is for ('laps', 'cover-up', 'UPF', 'high waist').",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "A piece name, code, fabric, colourway or keyword, e.g. 'one-piece', 'linen' or 'SS-107'."
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
    "name": "size_guide",
    "description": "Sol & Salt Swimwear's size chart in centimetres and inches, and — when body measurements are given — the size this label would actually put someone in for a named piece, with its fit note. Call this before suggesting a size; never guess one.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "item": {
          "type": "string",
          "description": "The piece being sized, by name or code, e.g. 'Tidal Scoop-Back One-Piece' or 'SS-109'. Leave blank for the plain chart."
        },
        "bust_cm": {
          "type": "number",
          "description": "Bust or chest measurement in centimetres, if the customer has given one."
        },
        "waist_cm": {
          "type": "number",
          "description": "Natural waist measurement in centimetres, if the customer has given one."
        },
        "hip_cm": {
          "type": "number",
          "description": "Fullest hip measurement in centimetres, if the customer has given one."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "shipping_and_returns",
    "description": "Sol & Salt Swimwear's delivery times, costs and duty handling, plus the returns and exchange policy — the window, what makes a piece returnable, and how a refund is paid back.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "destination": {
          "type": "string",
          "description": "Where the parcel is going: 'domestic', 'canada', 'europe', 'rest-of-world', or blank for everything."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  },
  {
    "name": "get_my_orders",
    "description": "Every order belonging to the signed-in customer at Sol & Salt Swimwear — what was in it, where it is, and whether it can still be returned or cancelled. Requires an identified (signed-in) visitor; call it with that visitor's own email.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "description": "The signed-in visitor's own email address."
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
  },
  {
    "name": "open_return_form",
    "description": "Open the return card on the page for the visitor to fill in and submit themselves — order number, which piece, reason, one button. Use it instead of asking for those three things one at a time in the conversation; pass anything already known (an order number from earlier in the chat, the piece being discussed) as prefill so only what is missing is left to type.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_number": {
          "type": "string",
          "description": "An order number to prefill, if already known, e.g. 'SS-31082'."
        },
        "item": {
          "type": "string",
          "description": "The piece to prefill, if already known."
        },
        "reason": {
          "type": "string",
          "description": "A reason to prefill, if already known: 'too-small', 'too-large', 'exchange-size', 'not-as-pictured', 'faulty' or 'changed-mind'."
        },
        "note": {
          "type": "string",
          "description": "A note to prefill, if the visitor has already said what they want to happen."
        }
      },
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true
    }
  }
];
