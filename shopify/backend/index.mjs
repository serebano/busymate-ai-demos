// sites/shopify/backend/index.mjs — Northline Outdoor's MCP tool handlers,
// plugged into the shared identity + generic-MCP server
// (sites/_shared/backend/mcp-identity-server.mjs takes NO catalog/order
// assumptions). ALL store data lives in ./catalog.mjs — the same module the
// site build projects into the page, the JSON-LD and the tenant knowledge,
// so the assistant, the MCP server and the storefront can never disagree.
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./_shared/tool-schema.mjs";
import { STORE, PRODUCTS, ORDERS, DEMO_CUSTOMER, findProduct, searchProducts, findOrder, publicProduct, stockSummary } from "./catalog.mjs";

const PORT = Number(process.env.PORT || 8101);
const ISSUER = process.env.ISSUER || STORE.url;
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const HANDLERS = {
  list_products: () => ({ products: PRODUCTS.map(publicProduct) }),
  search_products: ({ query }) => ({ results: searchProducts(query).map(publicProduct) }),
  get_product: ({ sku }) => {
    const p = findProduct(sku);
    return p ? { product: { ...publicProduct(p), stockSummary: stockSummary(p) } } : { error: "not_found" };
  },
  get_order_status: ({ order_number, email }) => {
    if (!order_number || !email) return { error: "missing_details", detail: "Type the order number and the email on the order into the card." };
    const found = findOrder(order_number, email);
    if (found.error) return { ...found, detail: found.error === "no_such_order" ? "I can't find an order with that number." : "That email doesn't match the order." };
    const o = found.order;
    const items = o.items.map((i) => { const p = findProduct(i.sku); return { ...i, title: p ? p.title : i.sku, price: p ? p.price : null }; });
    // Flat keys first: the chat's action card lists them; `order` keeps the full record for the assistant.
    return {
      orderNumber: o.orderNumber, status: o.status, placedAt: o.placedAt, tracking: o.tracking.split(" ")[0],
      eta: o.eta || null, deliveredAt: o.deliveredAt || null,
      items: items.map((i) => `${i.qty}× ${i.title} (${i.variant})`).join(", "),
      order: { ...o, items },
    };
  },
  start_return: ({ order_number, email, sku, reason }) => {
    if (!order_number || !email || !sku) return { error: "missing_details", detail: "Pick the order, the item and a reason in the card." };
    const found = findOrder(order_number, email);
    if (found.error) return { ...found, detail: found.error === "no_such_order" ? "I can't find an order with that number." : "That email doesn't match the order." };
    const hasItem = found.order.items.some((i) => i.sku.toLowerCase() === String(sku).toLowerCase());
    if (!hasItem) return { error: "item_not_on_order", detail: "That item isn't on this order." };
    const p = findProduct(sku);
    return {
      returnId: `RET-${found.order.orderNumber.replace(/[^0-9]/g, "")}-${sku.toUpperCase()}`,
      item: p ? p.title : sku.toUpperCase(),
      status: "return_started",
      refund: p ? `$${p.price} to the original payment method once the item is scanned by the carrier` : null,
      nextStep: "A prepaid return label would be emailed here on a real store.",
      reason: reason || null,
    };
  },
};

// The chat asks with a card, not a list of things to type (owner rule
// 2026-09-11, shared partial sites/_shared/ui/form-card.mjs): the two tools
// that need structured details carry one; the host mounts it in the message
// and the card calls the same tool back with what the shopper entered.
const returnableItems = ORDERS.flatMap((o) => o.items.map((i) => ({ value: i.sku, label: `${findProduct(i.sku)?.title || i.sku} — order ${o.orderNumber}` })));
const FORM_CARDS = {
  get_order_status: {
    title: "Check an order",
    intro: "Which order would you like me to look up?",
    submitLabel: "Check it",
    resultKeys: ["orderNumber", "status", "placedAt", "tracking", "eta", "deliveredAt", "items", "detail"],
    fields: [
      { name: "order_number", label: "Order number", type: "text", required: true, placeholder: "#1042", help: "It's on the confirmation email. The demo customer's orders are #1042 and #1039." },
      { name: "email", label: "Email on the order", type: "email", required: true, placeholder: DEMO_CUSTOMER.email },
    ],
  },
  start_return: {
    title: "Start a return",
    intro: "Tell me which item is going back and why.",
    submitLabel: "Start the return",
    resultKeys: ["returnId", "item", "status", "refund", "nextStep", "detail"],
    fields: [
      { name: "order_number", label: "Order number", type: "text", required: true, placeholder: "#1042" },
      { name: "email", label: "Email on the order", type: "email", required: true, placeholder: DEMO_CUSTOMER.email },
      { name: "sku", label: "Which item", type: "select", required: true, options: returnableItems },
      { name: "reason", label: "What went wrong", type: "textarea", placeholder: "Too small / arrived damaged / changed my mind" },
    ],
  },
};

const SCHEMA = toolsFor(STORE.name);
const tools = Object.fromEntries(Object.entries(SCHEMA).map(([name, def]) => [name, { ...def, handler: HANDLERS[name], ...(FORM_CARDS[name] ? { formCard: FORM_CARDS[name] } : {}) }]));

start({
  port: PORT,
  issuer: ISSUER,
  tenantId: TENANT_ID,
  keyDir: "/keys",
  wellKnownDir: "/wellknown",
  demoCustomer: DEMO_CUSTOMER,
  tools,
  storeName: STORE.name,
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demo-shopify" (sites/shopify/demo.json `assistant`).
  hostedOrigins: ["https://demo-shopify.busymate.ai", "https://busymate.ai"],
  // Agent-discovery convention puts the manifest under /.well-known/ too (the
  // static docroot would otherwise answer index.html there).
  wellKnownFiles: { "agents.json": new URL("./agents.json", import.meta.url).pathname },
});
