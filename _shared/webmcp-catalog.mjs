// sites/_shared/webmcp-catalog.mjs
//
// The SDK's `catalogDocument()` shape, built from any list of tool specs.
// scripts/gen-webmcp-catalog.mjs (a static demo, reading its own
// public/assets/page-tools.data.js twin) and sites/_shared/backend/
// agent-ready-static.mjs (a dynamic demo backend, reading its own in-memory
// tool list) both call this SAME function — never a second hand-rolled copy
// of the shape (#3053, #3054). Lives under sites/_shared/ (not scripts/) so a
// demo's Docker image — which already COPYs sites/_shared/** — can reach it
// without also pulling in scripts/.
export function buildCatalog(origin, toolSpecs) {
  return {
    version: 1,
    webmcp: "1",
    site: new URL(origin).host,
    origin,
    source: "server",
    exposedTo: ["https://busymate.ai"],
    tools: toolSpecs.map((tool) => ({
      name: tool.name,
      ...(tool.title ? { title: tool.title } : {}),
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: {
        readOnlyHint: tool.annotations?.readOnlyHint === true,
        untrustedContentHint: tool.annotations?.untrustedContentHint === true,
        consequentialHint:
          typeof tool.annotations?.consequentialHint === "boolean"
            ? tool.annotations.consequentialHint
            : tool.annotations?.readOnlyHint !== true,
      },
    })),
  };
}
