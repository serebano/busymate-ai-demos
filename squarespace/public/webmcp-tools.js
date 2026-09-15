// Quiet Pines Yoga — WebMCP page tools, registered on the real Squarespace
// trial site via a Code Block / Embed Block (this file's content pasted
// there as an inline script, alongside the busymate.ai embed loader — see
// sites/squarespace/README.md for exactly which block type actually
// renders a script on the PUBLISHED site at each Squarespace plan tier).
//
// document.modelContext is the STANDARD WebMCP surface (webmachinelearning)
// the embed also feature-detects; BusymateAI.registerPageTools is our
// polyfill shim over the same registry, kept for hosts on an older embed
// build. Registering through it here keeps this one script correct either
// way.
//
// view_page_sections reads the page's OWN rendered DOM (same-origin, no
// credential this script needs to hold) — the section headings currently on
// the page, exactly as Squarespace's editor rendered them. request_booking
// calls THIS demo's own MCP server so the tool logic has one source of
// truth (sites/squarespace/backend/tools.mjs) — it requires the visitor to
// be signed in through the widget first, same as the chat's own delegated
// tools.
(function () {
  function whenReady(fn) {
    var started = Date.now();
    (function poll() {
      if (window.BusymateAI && typeof window.BusymateAI.registerPageTools === "function") { fn(); return; }
      if (Date.now() - started > 15000) return;
      setTimeout(poll, 150);
    })();
  }

  var TOOLS = [
    {
      name: "view_page_sections",
      title: "View this page's sections",
      description: "The section headings currently rendered on THIS Squarespace page (whichever page the visitor is on), read straight off the live DOM.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        var headings = Array.prototype.slice.call(document.querySelectorAll("h1, h2, h3"))
          .map(function (h) { return h.textContent.trim(); })
          .filter(Boolean);
        return { path: location.pathname, title: document.title, headings: headings };
      },
    },
    {
      name: "request_booking",
      title: "Request a studio session",
      description: "Ask Quiet Pines Yoga to book a studio session for the signed-in visitor. Needs the widget's own sign-in first — call it anyway; a not-signed-in visitor gets a sign-in card.",
      inputSchema: {
        type: "object",
        properties: {
          option: { type: "string", description: "Which session, e.g. 'Free Consultation' or 'Basic Service'" },
          preferredTime: { type: "string", description: "A day/time the visitor would like, in their own words" },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async function (args) {
        var res = await fetch("https://squarespace.demo.busymate.ai/mcp", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: Date.now(), method: "tools/call",
            params: { name: "book_a_session", arguments: { option: args.option, preferredTime: args.preferredTime } },
          }),
        });
        var body = await res.json();
        return body.result || body;
      },
    },
  ];

  whenReady(function () {
    window.BusymateAI.registerPageTools(TOOLS);
    if (document.modelContext && typeof document.modelContext.registerTool === "function") {
      TOOLS.forEach(function (t) { document.modelContext.registerTool(t); });
    }
  });
})();
