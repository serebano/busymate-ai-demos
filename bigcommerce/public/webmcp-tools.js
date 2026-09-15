// Copperfield Kitchen Co. — WebMCP page tools, registered on the real BigCommerce
// storefront via Storefront -> Script Manager (this file's content is pasted there
// as an inline script, second entry alongside the busymate.ai embed loader).
//
// document.modelContext is the STANDARD WebMCP surface (webmachinelearning) the
// embed also feature-detects; BusymateAI.registerPageTools is our polyfill shim
// over the same registry, kept for hosts on an older embed build. Registering
// through it here keeps this one script correct either way.
//
// add_to_cart / view_cart act on the page's OWN BigCommerce Storefront Cart API
// (session-cookie-scoped, same origin, no credential this script needs to hold).
// get_order_status/track_order calls THIS demo's own MCP server so the tool
// logic has one source of truth (sites/bigcommerce/backend/tools.mjs) — it
// requires the shopper to be signed in through the widget first, same as the
// chat's own delegated tools.
(function () {
  function whenReady(fn) {
    var started = Date.now();
    (function poll() {
      if (window.BusymateAI && typeof window.BusymateAI.registerPageTools === "function") { fn(); return; }
      if (Date.now() - started > 15000) return;
      setTimeout(poll, 150);
    })();
  }

  async function cartApi(method, path, body) {
    var res = await fetch("/api/storefront/carts" + (path || ""), {
      method: method,
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return { error: "cart_request_failed", status: res.status };
    return res.status === 204 ? { ok: true } : res.json();
  }

  var TOOLS = [
    {
      name: "view_cart",
      title: "View the shopping cart",
      description: "The current shopper's real BigCommerce cart — line items, quantities and the running total. Reads the storefront's own Cart API.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async function () {
        var carts = await cartApi("GET");
        var cart = Array.isArray(carts) ? carts[0] : null;
        if (!cart) return { empty: true };
        return {
          lineItems: (cart.lineItems && cart.lineItems.physicalItems || []).map(function (i) {
            return { name: i.name, quantity: i.quantity, price: i.listPrice && i.listPrice.formatted };
          }),
          cartAmount: cart.cartAmount,
          currency: cart.currency && cart.currency.code,
        };
      },
    },
    {
      name: "add_to_cart",
      title: "Add a product to the cart",
      description: "Add one product, by BigCommerce product id and (optional) variant id, to the shopper's real cart on this storefront.",
      inputSchema: {
        type: "object",
        properties: {
          productId: { type: "number", description: "The BigCommerce product id" },
          variantId: { type: "number", description: "The variant id, if the product has options" },
          quantity: { type: "number", description: "How many (default 1)" },
        },
        required: ["productId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async function (args) {
        var lineItem = { productId: args.productId, quantity: args.quantity || 1 };
        if (args.variantId) lineItem.variantId = args.variantId;
        return cartApi("POST", "", { lineItems: [lineItem] });
      },
    },
    {
      name: "track_order",
      title: "Track a signed-in customer's order",
      description: "Where an order on the signed-in customer's Copperfield Kitchen Co. account has got to. Needs the widget's own sign-in first — call it anyway; a not-signed-in shopper gets a sign-in card.",
      inputSchema: {
        type: "object",
        properties: { orderNumber: { type: "string", description: "The order number, e.g. 101" } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async function (args) {
        var res = await fetch("https://bigcommerce.demo.busymate.ai/mcp", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: Date.now(), method: "tools/call",
            params: { name: "get_order_status", arguments: { orderNumber: args.orderNumber } },
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
