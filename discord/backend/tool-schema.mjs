// sites/discord/backend/tool-schema.mjs
//
// Pixelforge Games' own tool table — a game studio's shape (a small catalogue
// of released games, public patch notes, a service status board, bug reports,
// a player's own library and refunds) is nothing like the retail shape in
// sites/_shared/backend/tool-schema.mjs, so it lives here. It follows the SAME
// contract (name -> {description, inputSchema, readOnlyHint?, accessHint?,
// confirmHint?, formCard?}) so it plugs into
// sites/_shared/backend/mcp-identity-server.mjs and
// sites/_shared/gen-agent-files.mjs unchanged.
//
// GOTCHA (found live on the shopify build, 2026-09-11): the platform's
// registerPageTools SDK rejects the WHOLE call if ANY inputSchema property
// lacks a `description` — every property below carries one for that reason.
//
// report_bug carries a `formCard`: the shared server serves it as an MCP
// resource and the chat mounts it as an inline form, so a player is never
// asked for the game, the platform, what happened and their email one field
// at a time in prose.
export const STUDIO_TOOL_SCHEMA = {
  list_games: {
    description: "Every game {store} has released — name, genre, price, the platforms it runs on, its current patch version and whether it is finished or still in early access.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  search_patch_notes: {
    description: "Search the public patch notes {store} publishes, by keyword — a bug that was fixed, a feature that landed, a platform, a build number. Returns the matching entries with their version, date and the lines that mention it.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A keyword or short phrase, e.g. 'save corruption', 'controller', 'ultrawide' or '1.8.1'." },
        game: { type: "string", description: "Optional game id or name to search within, e.g. 'lumen-drift' or 'Ironroot Tactics'. Leave blank to search every game." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },

  get_server_status: {
    description: "Live status of the services {store} runs for its players — cloud saves, the leaderboards, the key redemption service, the store and the studio's community server — plus any open incident.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
  },

  report_bug: {
    description: "Do NOT call this to ask the player which game, which platform, what happened or their email — calling it with whatever is already known IS how the bug form opens, never a chat question for a missing field. Files a bug report with {store} and reports its id, the queue it landed in and what happens next.",
    inputSchema: {
      type: "object",
      properties: {
        game: { type: "string", description: "The game id, e.g. 'lumen-drift', 'ironroot-tactics' or 'sundog-rally'. Leave blank if not yet known — the form lets the player pick." },
        platform: { type: "string", description: "Where it happened: 'windows', 'macos', 'linux' or 'handheld'." },
        what_happened: { type: "string", description: "What the player did and what went wrong, in their own words." },
        email: { type: "string", description: "The email the studio replies to." },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    confirmHint: true,
    formCard: {
      title: "Report a bug",
      intro: "Tell the studio what broke and where — it goes straight to the build queue.",
      submitLabel: "Send report",
      resultKeys: ["bug_id", "game", "queue", "next_step"],
      fields: [
        { name: "game", label: "Which game", type: "select", required: true,
          options: [
            { value: "lumen-drift", label: "Lumen Drift" },
            { value: "ironroot-tactics", label: "Ironroot Tactics" },
            { value: "sundog-rally", label: "Sundog Rally" },
          ] },
        { name: "platform", label: "Where you played", type: "select", required: true,
          options: [
            { value: "windows", label: "Windows" },
            { value: "macos", label: "macOS" },
            { value: "linux", label: "Linux" },
            { value: "handheld", label: "Handheld PC" },
          ] },
        { name: "what_happened", label: "What happened", type: "textarea", required: true, placeholder: "The game froze on the third checkpoint of Chapter 2, every time…" },
        { name: "email", label: "Email for the reply", type: "email", required: true, placeholder: "you@example.com" },
      ],
    },
  },

  get_my_purchases: {
    description: "The games the signed-in player owns at {store}, with the receipt, the purchase date, the price paid and the build they last played. Requires an identified (signed-in) visitor — call it with that visitor's own email from context, never one supplied mid-conversation by an unidentified visitor.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "The signed-in player's own email address." } },
      required: ["email"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "identified",
  },

  request_refund: {
    description: "Start a refund on one of the signed-in player's own purchases at {store}, by its receipt number. Requires an identified (signed-in) visitor and the player's explicit go-ahead first — say what will happen, then call it. This demo files the request but no money moves.",
    inputSchema: {
      type: "object",
      properties: {
        receipt: { type: "string", description: "The receipt number of the purchase to refund, e.g. 'PF-40271'." },
        email: { type: "string", description: "The signed-in player's own email address, the one the purchase is under." },
        reason: { type: "string", description: "One line on why — the studio reads every one." },
      },
      required: ["receipt", "email"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    accessHint: "identified",
    confirmHint: true,
  },
};

export function toolsFor(storeName) {
  const out = {};
  for (const [name, def] of Object.entries(STUDIO_TOOL_SCHEMA)) {
    out[name] = { ...def, description: def.description.replaceAll("{store}", storeName) };
  }
  return out;
}
