// sites/scan/backend/tools.mjs
//
// Beacon's own MCP tool table. Beacon has no catalogue or order book — its
// tools are the demo itself: launch the real quick start, list or reveal the
// pre-scanned examples, read a live AI-readiness score for ANY host through
// the same checker the page links to, and (once identified) recall what this
// visitor has already scanned this session.
import { demoCustomer, EXAMPLES, normalizeHost, recordScan, scansFor } from "./store.mjs";

const READINESS_API = "https://busymate.ai/api/try/readiness";

export const TOOL_TABLE = {
  scan_site: {
    description:
      "Open the real Busymate AI quick start for a website address, at busymate.ai/try/<host> — "
      + "the same one-click scan and grounded assistant preview this page demonstrates.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "A website address, with or without https://, e.g. 'acme.com' or 'https://acme.com'." },
      },
      required: ["url"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ url }) => {
      const host = normalizeHost(url);
      if (!host) return { error: "invalid_url", detail: "That did not look like a website address — try something like acme.com." };
      return { ok: true, host, url: `https://busymate.ai/try/${encodeURIComponent(host)}` };
    },
  },

  list_examples: {
    description: "List the three pre-scanned example sites this demo links to, with their live busymate.ai/try/<host> result URL.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "public",
    handler: () => ({
      examples: Object.entries(EXAMPLES).map(([site, ex]) => ({ site, label: ex.label, tryUrl: ex.tryUrl })),
    }),
  },

  show_example: {
    description: "Detail on one of the three pre-scanned example sites (its label and live quick-start result URL).",
    inputSchema: {
      type: "object",
      properties: { site: { type: "string", enum: Object.keys(EXAMPLES) } },
      required: ["site"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: ({ site }) => {
      const ex = EXAMPLES[site];
      if (!ex) return { error: "unknown_example", detail: "That is not one of the three pre-scanned examples on this page." };
      return { ok: true, site, label: ex.label, tryUrl: ex.tryUrl };
    },
  },

  get_readiness: {
    description:
      "Score ANY website's AI-readiness live — the same six-layer checker (llms.txt, agents.json, "
      + "MCP, WebMCP, structured data, robots/sitemap) the quick start runs, so an agent can grade a "
      + "site without leaving this conversation.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "A website address, with or without https://, e.g. 'acme.com' or 'https://acme.com'." },
      },
      required: ["url"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    accessHint: "public",
    handler: async ({ url }, ctx) => {
      const host = normalizeHost(url);
      if (!host) return { error: "invalid_url", detail: "That did not look like a website address — try something like acme.com." };
      recordScan(ctx?.customerId, host);
      try {
        const res = await fetch(`${READINESS_API}?site=${encodeURIComponent(host)}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return { error: "checker_unavailable", status: res.status, host };
        const body = await res.json();
        const score = body?.result?.score;
        const checks = Array.isArray(body?.result?.checks)
          ? body.result.checks.map((c) => ({ id: c.id, layer: c.layer, status: c.status }))
          : [];
        return { ok: true, host, score, checks, tryUrl: `https://busymate.ai/try/${encodeURIComponent(host)}` };
      } catch (e) {
        return { error: "checker_unreachable", detail: e.message, host };
      }
    },
  },

  my_recent_scans: {
    description:
      "The signed-in demo visitor's own scan history from this session — which hosts they have already "
      + "looked up with get_readiness or scan_site. Answers only for the customer signed in on this page.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    accessHint: "delegated",
    handler: (_args, ctx) => ({
      customer: ctx?.customerId === demoCustomer.id ? { name: demoCustomer.name } : null,
      scans: scansFor(ctx?.customerId),
    }),
  },
};
