// sites/telegram/backend/index.mjs — Nomad Circuits' data + tool handlers,
// plugged into the shared identity + generic-MCP server
// (sites/_shared/backend/mcp-identity-server.mjs takes NO catalogue/order
// assumptions — this file owns the shop shape and the handlers).
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./tool-schema.mjs";

const PORT = Number(process.env.PORT || 8103);
const ISSUER = process.env.ISSUER || "https://telegram.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const STORE_NAME = "Nomad Circuits";

// Tue-Sat full service; Sunday repair pickup/drop-off only (no new orders
// taken in person, online ordering still works); closed Monday.
const HOURS = {
  Mon: null,
  Tue: [{ label: "Counter & repairs", open: "10:00", close: "18:00" }],
  Wed: [{ label: "Counter & repairs", open: "10:00", close: "18:00" }],
  Thu: [{ label: "Counter & repairs", open: "10:00", close: "18:00" }],
  Fri: [{ label: "Counter & repairs", open: "10:00", close: "18:00" }],
  Sat: [{ label: "Counter & repairs", open: "10:00", close: "18:00" }],
  Sun: [{ label: "Repair pickup/drop-off only", open: "11:00", close: "15:00" }],
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATALOG = [
  {
    section: "Power & Charging",
    items: [
      { sku: "NC-PWR-20K", name: "Voyager 20K Power Bank", price: 49, tags: ["bestseller"], description: "20,000mAh, 65W USB-C PD fast charge — enough for a phone 4x or a laptop top-up." },
      { sku: "NC-SOL-14", name: "Solstice Solar Panel", price: 39, tags: ["eco"], description: "14W foldable solar charger, clips to a pack, IP64 splashproof." },
      { sku: "NC-ADP-GL", name: "Everywhere Adapter", price: 24, tags: ["essential"], description: "One plug for 190+ countries, 2x USB-C + 1x USB-A, 65W GaN inside." },
    ],
  },
  {
    section: "Connectivity",
    items: [
      { sku: "NC-HSP-5G", name: "PocketLink 5G Hotspot", price: 89, tags: ["connectivity"], description: "eSIM-ready pocket wifi, connects 10 devices, 12-hour battery." },
      { sku: "NC-EAR-EB", name: "Everyday EchoBuds", price: 69, tags: [], description: "Active noise cancelling travel earbuds, 30-hour case, water resistant." },
      { sku: "NC-TRN-40", name: "Lingua Mini Translator", price: 99, tags: ["popular"], description: "Two-way voice translation across 40 languages, 12 of them work offline." },
    ],
  },
  {
    section: "Capture & Read",
    items: [
      { sku: "NC-CAM-4K", name: "TrailCam 4K", price: 159, tags: [], description: "Rugged 4K action camera, waterproof to 10m, image stabilization." },
      { sku: "NC-DRN-MC", name: "Skyline Micro Drone", price: 199, tags: ["bestseller"], description: "249g foldable 4K drone, under most airline carry-on drone limits." },
      { sku: "NC-RDR-WP", name: "InkPage Reader", price: 129, tags: [], description: "Waterproof e-reader, weeks of battery, holds about 10,000 books." },
    ],
  },
  {
    section: "Care & Repairs",
    items: [
      { sku: "NC-SVC-SCR", name: "Screen Repair", price: 59, priceNote: "from", tags: ["service"], description: "Most phone and tablet models, about 45 minutes." },
      { sku: "NC-SVC-BAT", name: "Battery Swap", price: 39, priceNote: "from", tags: ["service"], description: "Same-day on most models." },
      { sku: "NC-SVC-DIAG", name: "Free Diagnostic", price: 0, tags: ["service"], description: "15-minute check, no obligation." },
    ],
  },
];
const ALL_ITEMS = CATALOG.flatMap((s) => s.items.map((i) => ({ ...i, section: s.section })));

const demoCustomer = { id: "cust_demo_nomad_01", name: "Priya Fenwick", email: "priya@example.com" };

// In-memory demo orders + repairs. Seeded so track_order/get_my_account have
// something to show immediately; place_order/book_repair append more
// (reset on restart — this is a public demo, not a real order system).
const orders = [
  { number: "NC-48213", customerId: demoCustomer.id, email: demoCustomer.email, name: demoCustomer.name, items: [{ sku: "NC-PWR-20K", name: "Voyager 20K Power Bank", qty: 1 }, { sku: "NC-ADP-GL", name: "Everywhere Adapter", qty: 1 }], total: 73, status: "in transit", carrier: "GlobalPost", tracking: "GP-9931-4402", placed: "2026-09-10", eta: "2026-09-15" },
  { number: "NC-44010", customerId: demoCustomer.id, email: demoCustomer.email, name: demoCustomer.name, items: [{ sku: "NC-RDR-WP", name: "InkPage Reader", qty: 1 }], total: 129, status: "delivered", carrier: "GlobalPost", tracking: "GP-8810-1120", placed: "2026-08-01", eta: "2026-08-07" },
];
const repairs = [
  { ticket: "NC-R-1042", customerId: demoCustomer.id, email: demoCustomer.email, name: demoCustomer.name, device: "Phone (cracked screen)", issue: "Cracked screen", status: "ready for pickup", dropOff: "2026-09-08" },
];
let orderSeq = 48214;
let repairSeq = 1043;

function dayKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return DAY_NAMES[d.getUTCDay()];
}

function findItem(sku) {
  const k = String(sku ?? "").toUpperCase().trim();
  return ALL_ITEMS.find((i) => i.sku === k || i.name.toLowerCase() === k.toLowerCase()) ?? null;
}

const HANDLERS = {
  opening_hours: () => ({ hours: HOURS, note: "Closed Monday. Sunday is repair pickup/drop-off only — online orders still ship every day." }),
  list_catalog: () => ({ catalog: CATALOG }),
  search_catalog: ({ query }) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return { results: ALL_ITEMS };
    return {
      results: ALL_ITEMS.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
          || i.section.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q)),
      ),
    };
  },
  place_order: ({ sku, quantity, name, email, country }) => {
    const item = findItem(sku);
    if (!item) return { error: "unknown_item", detail: "I don't have that item in the catalogue." };
    if (!name || !email || !country) return { error: "missing_details", detail: "A name, email and shipping country are all needed to place the order." };
    const qty = Math.max(1, Number(quantity) || 1);
    const number = `NC-${orderSeq++}`;
    const total = item.price * qty;
    const record = {
      number, customerId: email === demoCustomer.email ? demoCustomer.id : null, email, name,
      items: [{ sku: item.sku, name: item.name, qty }], total, status: "processing",
      carrier: null, tracking: null, placed: new Date().toISOString().slice(0, 10), eta: null,
    };
    orders.push(record);
    return { order_number: number, status: "processing", total: `$${total}`, eta: "3-7 business days once it ships" };
  },
  book_repair: ({ device, issue, name, email, preferred_date, preferred_time }) => {
    if (!device || !issue || !name || !email) return { error: "missing_details", detail: "A device, the issue, a name and an email are all needed to book a repair." };
    const ticket = `NC-R-${repairSeq++}`;
    const record = {
      ticket, customerId: email === demoCustomer.email ? demoCustomer.id : null, email, name,
      device, issue, status: "booked", dropOff: preferred_date && preferred_time ? `${preferred_date} ${preferred_time}` : "to be confirmed",
    };
    repairs.push(record);
    return { ticket_number: ticket, status: "booked", drop_off: record.dropOff };
  },
  track_order: ({ reference, email }) => {
    const ref = String(reference ?? "").toUpperCase().trim();
    if (!ref || !email) return { error: "missing_details", detail: "An order or ticket number and the email it was placed under are both needed." };
    if (ref.startsWith("NC-R-")) {
      const r = repairs.find((x) => x.ticket === ref && x.email.toLowerCase() === String(email).toLowerCase());
      if (!r) return { error: "not_found", detail: "I can't find a repair ticket with that number on that email." };
      return { kind: "repair", status: r.status, device: r.device, eta: r.dropOff };
    }
    const o = orders.find((x) => x.number === ref && x.email.toLowerCase() === String(email).toLowerCase());
    if (!o) return { error: "not_found", detail: "I can't find an order with that number on that email." };
    return { kind: "order", status: o.status, carrier: o.carrier ?? "not shipped yet", tracking: o.tracking ?? "—", eta: o.eta ?? "—", items: o.items.map((i) => `${i.qty} x ${i.name}`).join(", ") };
  },
  get_my_account: ({ email }) => {
    const mine = String(email ?? "").toLowerCase();
    return {
      orders: orders.filter((o) => o.email.toLowerCase() === mine),
      repairs: repairs.filter((r) => r.email.toLowerCase() === mine),
    };
  },
  contact_us: ({ name, email, message }) => {
    if (!name || !email || !message) return { error: "missing_details", detail: "I need a name, an email address and a message." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "bad_email", detail: "That email address does not look right." };
    const reference = `NC-MSG-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      reference, receivedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      detail: "Thanks — a real shop would reply to this within one working day. Nomad Circuits is a demonstration shop, so nothing was actually sent.",
    };
  },
};

const SCHEMA = toolsFor(STORE_NAME);
const tools = Object.fromEntries(Object.entries(SCHEMA).map(([name, def]) => [name, { ...def, handler: HANDLERS[name] }]));

start({
  port: PORT,
  issuer: ISSUER,
  tenantId: TENANT_ID,
  keyDir: "/keys",
  wellKnownDir: "/wellknown",
  demoCustomer,
  tools,
  storeName: STORE_NAME,
});
