// Larkspur Studio's own MCP server (busymate-devtools#2969) — a minimal,
// dependency-free (Node core only) JSON-RPC 2.0 server exposing this
// WordPress content site's own data as tools, connected to the tenant via
// `upsert_tenant_connector`. Distinct from the WebMCP page tools (which run
// client-side, in the visitor's own session): this is the SERVER-side half
// the full-feature-demo standard asks for, reading the site over its own
// public WP REST API and posting consultation requests through the SAME
// `busymate/v1/consultation` route the plugin's WebMCP tool calls — one
// source of truth for that action either way.
import http from "node:http";

const PORT = Number(process.env.PORT || 8115);
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://wordpress.demo.busymate.ai";

const SERVICES = [
  { name: "Design Package", from: "£2,400", summary: "A full plan for a room, floor or whole home: survey, layout options, materials and lighting palette, buildable spec sheet. 4-12 weeks." },
  { name: "Renovation Consulting", from: "£180/day", summary: "Independent oversight through a build: quote review, site visits, second opinions on site. Booked by the day." },
  { name: "Room Refresh", from: "£650", summary: "A single afternoon on site plus a follow-up plan: layout, materials shortlist, up to five sourced pieces. No structural changes." },
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function wpFetch(path, init) {
  const res = await fetch(new URL(path, SITE_ORIGIN), init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON is handled by the caller */ }
  return { ok: res.ok, status: res.status, json, text };
}

const plain = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&#8217;/g, "'").replace(/&#8211;/g, "-").replace(/\s+/g, " ").trim();

const TOOLS = {
  list_services: {
    description: "The three service tiers Larkspur Studio offers, with their starting price and a one-line summary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    handler: async () => ({ services: SERVICES }),
  },
  get_contact_info: {
    description: "This demo studio's (fictional) address, email and hours.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    handler: async () => ({
      address: "14 Cotham Vale, Bristol BS6 (by appointment only)",
      email: "hello@wordpress.demo.busymate.ai",
      hours: "Monday-Friday, 9:00-17:30",
      note: "Demo business — this address/email is not real.",
    }),
  },
  search_content: {
    description: "Search this site's own published pages and blog posts (title + excerpt + link) for a query — reads WordPress's own public REST API, so it can never drift from what the site actually shows.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "What to search for, e.g. 'reading nook' or 'renovation quote'" } },
      required: ["query"],
      additionalProperties: false,
    },
    readOnlyHint: true,
    handler: async (args) => {
      const q = String(args?.query ?? "").trim();
      if (!q) return { error: "empty_query", detail: "Tell me what to search for." };
      const results = [];
      for (const type of ["pages", "posts"]) {
        const r = await wpFetch(`/wp-json/wp/v2/${type}?search=${encodeURIComponent(q)}&per_page=5`);
        if (r.ok && Array.isArray(r.json)) {
          for (const item of r.json) {
            results.push({
              type: type === "pages" ? "page" : "post",
              title: plain(item.title?.rendered),
              excerpt: plain(item.excerpt?.rendered).slice(0, 240),
              url: item.link,
            });
          }
        }
      }
      return { query: q, results };
    },
  },
  request_consultation: {
    description: "Start a consultation request with Larkspur Studio. Call this as soon as the visitor says they want to book or get a quote, even before they have given every detail.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The visitor's name" },
        email: { type: "string", description: "Where to reach them" },
        project: { type: "string", description: "What they want done, in their own words" },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    handler: async (args) => {
      const r = await wpFetch("/wp-json/busymate/v1/consultation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args || {}),
      });
      if (!r.ok || !r.json) return { error: "could_not_submit" };
      if (!r.json.ok) return { error: r.json.detail || "could_not_submit" };
      return { confirmed: true, reference: r.json.reference };
    },
  },
};

async function jsonRpcHandle(msg) {
  const { id, method, params } = msg || {};
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  const err = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
  if (method === "initialize") {
    return reply({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "Larkspur Studio MCP", version: "1.0.0" },
    });
  }
  if (method === "tools/list") {
    return reply({
      tools: Object.entries(TOOLS).map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: { readOnlyHint: !!t.readOnlyHint, consequentialHint: !t.readOnlyHint },
      })),
    });
  }
  if (method === "tools/call") {
    const tool = TOOLS[params?.name];
    if (!tool) return err(-32601, `unknown tool ${params?.name}`);
    try {
      const out = await tool.handler(params?.arguments || {});
      return reply({ content: [{ type: "text", text: JSON.stringify(out) }], isError: !!out?.error });
    } catch (e) {
      return err(-32000, e.message);
    }
  }
  return err(-32601, `unknown method ${method}`);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET" && req.url === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok\n");
      return;
    }
    if (req.method === "GET" && req.url === "/api/bmai/status") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, server: "larkspur-mcp", tools: Object.keys(TOOLS) }));
      return;
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
        "access-control-allow-methods": "POST, OPTIONS",
      });
      res.end();
      return;
    }
    if (req.method === "POST" && req.url === "/mcp") {
      const body = await readBody(req);
      let msg;
      try { msg = JSON.parse(body); } catch { msg = null; }
      const out = msg ? await jsonRpcHandle(msg) : { jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } };
      res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      res.end(JSON.stringify(out));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal", detail: String(e?.message ?? e) }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[larkspur-mcp] listening on :${PORT}, site origin ${SITE_ORIGIN}`);
});
