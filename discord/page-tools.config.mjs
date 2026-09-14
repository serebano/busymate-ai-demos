// sites/discord/page-tools.config.mjs
//
// WHICH tools the page publishes over WebMCP, in one place. build.mjs turns
// this into public/assets/page-tools.data.js (and through it
// /webmcp-catalog.json), and agent-files.config.mjs reads the same two exports
// for llms.txt and agents.json — so the page, the catalogue and the agent card
// can never disagree about what is reachable where.
//
// The page registers the READS plus open_bug_report_form. The writes
// (report_bug, request_refund) stay on the MCP server, where the action card
// and the identified-visitor gate live.

/** MCP tools the PAGE also registers over WebMCP, in the order it shows them. */
export const PAGE_TOOLS = ["list_games", "search_patch_notes", "get_server_status", "get_my_purchases"];

/** The one tool that exists only in the page: it opens the bug form on the page itself. */
export const WEBMCP_ONLY = {
  open_bug_report_form: {
    description: "Open the bug-report form on the page itself for the player to fill in and send — game, platform, what happened and an email, with one \"Send report\" button. Use this when the player is looking at the page; pass anything already known (the game they named, the platform, what they described, a signed-in player's own email) as prefill so they only fill in what is missing.",
    inputSchema: {
      type: "object",
      properties: {
        game: { type: "string", description: "A game id to prefill, if already known: 'lumen-drift', 'ironroot-tactics' or 'sundog-rally'." },
        platform: { type: "string", description: "A platform to prefill, if already known: 'windows', 'macos', 'linux' or 'handheld'." },
        what_happened: { type: "string", description: "What the player already described, to prefill the description." },
        email: { type: "string", description: "An email to prefill, if already known (e.g. the signed-in player's own)." },
      },
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
};
