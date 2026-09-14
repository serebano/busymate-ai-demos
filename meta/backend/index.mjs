// sites/meta/backend/index.mjs — Sol & Salt Swimwear's data + tool handlers,
// plugged into the shared identity + generic-MCP server
// (sites/_shared/backend/mcp-identity-server.mjs takes NO catalogue
// assumptions — this file owns the collection, the size chart, the policy,
// the order book and the handlers).
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./tool-schema.mjs";

const PORT = Number(process.env.PORT || 8109);
const ISSUER = process.env.ISSUER || "https://meta.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing
// Defaults are the container's mounted volumes; overridable so the same file
// runs locally from a scratch directory during a build.
const KEY_DIR = process.env.KEY_DIR || "/keys";
const WELL_KNOWN_DIR = process.env.WELL_KNOWN_DIR || "/wellknown";

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const STORE_NAME = "Sol & Salt Swimwear";
const CURRENCY = "USD";

// ── The collection ───────────────────────────────────────────────────────────
// Twelve pieces, two categories. Every fabric, weight, size range and price
// here is the SAME data the page shows and the knowledge base quotes, so an
// answer from the assistant and a line on the page can never disagree.
const COLLECTION = [
  {
    sku: "SS-101", name: "Dune One-Piece", category: "swim", price: 128,
    fabric: "78% regenerated nylon, 22% elastane — 210 gsm, double-lined front",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], colours: ["Sand", "Sea", "Coral"],
    description: "A square-neck one-piece with a high, covered back and removable cups. Cut long in the body, so it stays put on a dive.",
    care: "Rinse cold after every swim, dry flat in the shade.",
  },
  {
    sku: "SS-102", name: "Tidal Scoop-Back One-Piece", category: "swim", price: 132,
    fabric: "78% regenerated nylon, 22% elastane — 210 gsm, double-lined front",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], colours: ["Sea", "Black Salt", "Coral"],
    description: "Our swimmer's suit: a deep scoop back, wide straps that do not slip, and a leg line cut for distance rather than photographs.",
    care: "Rinse cold after every swim, dry flat in the shade.",
  },
  {
    sku: "SS-103", name: "Salt Flat Triangle Top", category: "swim", price: 62,
    fabric: "78% regenerated nylon, 22% elastane — 210 gsm, fully lined",
    sizes: ["XS", "S", "M", "L", "XL"], colours: ["Coral", "Sand", "Sea"],
    description: "A triangle top with sliders at both ends, so one size covers two cup shapes.",
    care: "Rinse cold, dry flat.",
  },
  {
    sku: "SS-104", name: "Salt Flat Tie Bottom", category: "swim", price: 58,
    fabric: "78% regenerated nylon, 22% elastane — 210 gsm, fully lined",
    sizes: ["XS", "S", "M", "L", "XL"], colours: ["Coral", "Sand", "Sea"],
    description: "Side-tie bottoms with a mid rise and moderate back coverage. Pairs with the Salt Flat top or the Reef bandeau.",
    care: "Rinse cold, dry flat.",
  },
  {
    sku: "SS-105", name: "Reef Ribbed Bandeau", category: "swim", price: 68,
    fabric: "72% regenerated nylon, 28% elastane rib — 240 gsm",
    sizes: ["XS", "S", "M", "L", "XL"], colours: ["Sea", "Sand"],
    description: "A ribbed bandeau with a silicone band inside the top edge and detachable straps in the box.",
    care: "Rinse cold, dry flat. The rib relaxes about a centimetre when wet.",
  },
  {
    sku: "SS-106", name: "Harbour High-Waist Bottom", category: "swim", price: 64,
    fabric: "78% regenerated nylon, 22% elastane — 210 gsm, fully lined",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], colours: ["Sea", "Sand", "Coral", "Black Salt"],
    description: "Sits on the natural waist with full back coverage and a bonded edge that does not dig in.",
    care: "Rinse cold, dry flat.",
  },
  {
    sku: "SS-107", name: "Breakwater Rash Guard", category: "swim", price: 96,
    fabric: "82% recycled nylon, 18% elastane jersey — UPF 50+, flatlock seams",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], colours: ["Black Salt", "Sea"],
    description: "Long-sleeved, quarter-zip, thumb loops. Blocks 98% of UV and stays blocking it after a hundred washes.",
    care: "Cold machine wash, no softener — softener kills the UPF finish.",
  },
  {
    sku: "SS-108", name: "Sunbreak Swim Short", category: "swim", price: 78,
    fabric: "100% recycled polyester, 4-way stretch — mesh liner, 5\" inseam",
    sizes: ["28", "30", "32", "34", "36", "38", "40"], colours: ["Sea", "Sand", "Coral"],
    description: "The short short: elastic waist, drawcord, a zip pocket that actually drains.",
    care: "Rinse cold, line dry.",
  },
  {
    sku: "SS-109", name: "Longshore Board Short", category: "swim", price: 88,
    fabric: "100% recycled polyester, 4-way stretch — mesh liner, 7\" inseam",
    sizes: ["28", "30", "32", "34", "36", "38", "40"], colours: ["Black Salt", "Sea"],
    description: "A longer board short with a flat fly, a welded back pocket and no Velcro anywhere near your skin.",
    care: "Rinse cold, line dry.",
  },
  {
    sku: "SS-110", name: "Palmetto Linen Camp Shirt", category: "resort", price: 110,
    fabric: "100% washed European linen — 165 gsm, corozo buttons",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], colours: ["Shell", "Sand", "Sea"],
    description: "A camp-collar shirt that goes straight over a wet suit without clinging. Unisex cut.",
    care: "Cold wash, tumble low for ten minutes, hang.",
  },
  {
    sku: "SS-111", name: "Verano Linen Short", category: "resort", price: 92,
    fabric: "100% washed European linen — 165 gsm, drawcord waist",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], colours: ["Shell", "Sand"],
    description: "An easy pull-on short with deep pockets, cut to sit just above the knee. Unisex.",
    care: "Cold wash, hang.",
  },
  {
    sku: "SS-112", name: "Solstice Cotton Kaftan", category: "resort", price: 124,
    fabric: "100% organic cotton gauze — double layer through the body",
    sizes: ["XS/S", "M/L", "XL/XXL"], colours: ["Shell", "Coral"],
    description: "A long kaftan with side slits and a corded neck tie. Packs to the size of a paperback.",
    care: "Cold wash, hang. It creases; that is the cloth, not a fault.",
  },
];

// ── Sizing ───────────────────────────────────────────────────────────────────
const SIZE_CHART = [
  { size: "XS", bust_cm: [78, 82], waist_cm: [60, 64], hip_cm: [86, 90], us: "0–2", uk: "4–6", eu: "32–34" },
  { size: "S", bust_cm: [83, 87], waist_cm: [65, 69], hip_cm: [91, 95], us: "4–6", uk: "8–10", eu: "36–38" },
  { size: "M", bust_cm: [88, 93], waist_cm: [70, 75], hip_cm: [96, 101], us: "8–10", uk: "12–14", eu: "40–42" },
  { size: "L", bust_cm: [94, 100], waist_cm: [76, 82], hip_cm: [102, 108], us: "12–14", uk: "16–18", eu: "44–46" },
  { size: "XL", bust_cm: [101, 108], waist_cm: [83, 90], hip_cm: [109, 116], us: "16–18", uk: "20–22", eu: "48–50" },
  { size: "XXL", bust_cm: [109, 116], waist_cm: [91, 98], hip_cm: [117, 124], us: "20–22", uk: "24–26", eu: "52–54" },
];
const SHORT_CHART = [
  { size: "28", waist_cm: [71, 74] }, { size: "30", waist_cm: [75, 79] }, { size: "32", waist_cm: [80, 84] },
  { size: "34", waist_cm: [85, 89] }, { size: "36", waist_cm: [90, 94] }, { size: "38", waist_cm: [95, 99] },
  { size: "40", waist_cm: [100, 104] },
];
const FIT_NOTES = {
  "SS-101": "Cut long in the body. If you are over 175 cm, size up for torso length rather than width.",
  "SS-102": "Runs true. The scoop back holds — it does not need a size down to stay put.",
  "SS-105": "The rib relaxes about a centimetre wet; between two sizes, take the smaller one.",
  "SS-107": "Athletic fit over bare skin. Size up if you wear it over a suit.",
  "SS-112": "One size covers two — XS/S, M/L, XL/XXL — and it is meant to hang loose.",
};

// ── Shipping & returns ───────────────────────────────────────────────────────
const SHIPPING = {
  domestic: { label: "United States", cost: "Free over $95, otherwise $7 flat", time: "2–4 business days", duties: "None — prices already include US sales tax where it applies." },
  canada: { label: "Canada", cost: "$14 flat", time: "5–8 business days", duties: "Duties and taxes are collected at checkout, so nothing is owed at the door." },
  europe: { label: "Europe", cost: "$18 flat", time: "5–9 business days", duties: "VAT and duty are collected at checkout, so nothing is owed at the door." },
  "rest-of-world": { label: "Rest of the world", cost: "$24 flat", time: "8–14 business days", duties: "Duties are payable to the carrier on delivery." },
};
const RETURNS = {
  window_days: 30,
  window: "30 days from the day it was delivered",
  condition: "Unworn, tags on, and the hygiene liner still in place on any bottom or one-piece.",
  cost: "Free return label within the United States; $9 is deducted from the refund elsewhere. Exchanges ship free, everywhere.",
  refund: "Back to the original payment method within 5 business days of the parcel reaching the studio.",
  faults: "A fault in the fabric or the stitching is covered for 12 months, whatever the return window says.",
  exchanges: "One free size exchange per order — the new size is held for 7 days while the first one travels.",
};

// ── The demo customer and her order book ─────────────────────────────────────
const demoCustomer = { id: "cust_demo_solsalt_01", name: "Amara Okafor", email: "amara@example.com", phone: "+1-555-0166" };

const orders = [
  {
    number: "SS-31082", email: demoCustomer.email, name: demoCustomer.name, placed: "2026-09-02",
    status: "delivered", delivered: "2026-09-09", carrier_note: "Left with the building concierge.",
    items: [
      { sku: "SS-102", name: "Tidal Scoop-Back One-Piece", colour: "Sea", size: "M", price: 132 },
      { sku: "SS-110", name: "Palmetto Linen Camp Shirt", colour: "Sand", size: "S", price: 110 },
    ],
    total: 242,
  },
  {
    number: "SS-31460", email: demoCustomer.email, name: demoCustomer.name, placed: "2026-09-13",
    status: "processing", delivered: null, carrier_note: "Picked in the studio, not dispatched yet.",
    items: [
      { sku: "SS-103", name: "Salt Flat Triangle Top", colour: "Coral", size: "M", price: 62 },
      { sku: "SS-106", name: "Harbour High-Waist Bottom", colour: "Coral", size: "M", price: 64 },
    ],
    total: 126,
  },
  {
    number: "SS-30755", email: demoCustomer.email, name: demoCustomer.name, placed: "2026-07-28",
    status: "delivered", delivered: "2026-08-02", carrier_note: "Signed for.",
    items: [{ sku: "SS-107", name: "Breakwater Rash Guard", colour: "Black Salt", size: "M", price: 96 }],
    total: 96,
  },
];
const returnsRaised = [];
let returnSeq = 4471;

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, days) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

function returnWindow(order) {
  if (!order.delivered) return { open: false, reason: "not_delivered", closes: null };
  const closes = addDays(order.delivered, RETURNS.window_days);
  return { open: today() <= closes, reason: today() <= closes ? null : "window_closed", closes };
}

const byName = (text) => {
  const q = String(text || "").toLowerCase().trim();
  if (!q) return null;
  return COLLECTION.find((p) => p.sku.toLowerCase() === q)
    || COLLECTION.find((p) => p.name.toLowerCase() === q)
    || COLLECTION.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()))
    || null;
};

/** The size whose range contains the measurement, or the next size up when it
 *  falls between two — a swim knit that is a centimetre tight is unwearable. */
function sizeFor(chart, key, value) {
  if (typeof value !== "number") return null;
  for (const row of chart) {
    const range = row[key];
    if (!range) continue;
    if (value <= range[1]) return row.size;
  }
  return chart[chart.length - 1].size;
}

const HANDLERS = {
  list_collection: ({ category }) => {
    const want = String(category || "all").toLowerCase();
    const pieces = want === "all" || !want ? COLLECTION : COLLECTION.filter((p) => p.category === want);
    return { currency: CURRENCY, count: pieces.length, pieces, categories: ["swim", "resort"] };
  },

  search_products: ({ query }) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return { currency: CURRENCY, results: COLLECTION };
    const words = q.split(/\s+/).filter(Boolean);
    const hit = (p) => {
      const hay = [p.sku, p.name, p.fabric, p.description, p.category, p.colours.join(" "), p.sizes.join(" ")]
        .join(" ").toLowerCase();
      return words.some((w) => hay.includes(w));
    };
    const results = COLLECTION.filter(hit);
    return {
      currency: CURRENCY,
      results,
      note: results.length ? undefined : "Nothing in the collection matches that — say what it is for (laps, a long swim, a cover-up) and I will point you at the right piece.",
    };
  },

  size_guide: ({ item, bust_cm, waist_cm, hip_cm }) => {
    const piece = byName(item);
    const isShort = piece && piece.sizes.includes("32");
    const chart = isShort ? SHORT_CHART : SIZE_CHART;
    const given = { bust_cm, waist_cm, hip_cm };
    const candidates = isShort
      ? [sizeFor(SHORT_CHART, "waist_cm", waist_cm)]
      : [sizeFor(SIZE_CHART, "bust_cm", bust_cm), sizeFor(SIZE_CHART, "waist_cm", waist_cm), sizeFor(SIZE_CHART, "hip_cm", hip_cm)];
    const named = candidates.filter(Boolean);
    const order = chart.map((r) => r.size);
    const recommended = named.length ? named.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] : null;
    return {
      chart: chart.map((r) => (isShort
        ? { size: r.size, waist_cm: r.waist_cm.join("–"), waist_in: r.waist_cm.map((v) => Math.round(v / 2.54)).join("–") }
        : {
          size: r.size, us: r.us, uk: r.uk, eu: r.eu,
          bust_cm: r.bust_cm.join("–"), waist_cm: r.waist_cm.join("–"), hip_cm: r.hip_cm.join("–"),
          bust_in: r.bust_cm.map((v) => Math.round(v / 2.54)).join("–"),
        })),
      measured: Object.fromEntries(Object.entries(given).filter(([, v]) => typeof v === "number")),
      item: piece ? { sku: piece.sku, name: piece.name, sizes: piece.sizes } : null,
      recommended_size: recommended,
      fit_note: piece ? (FIT_NOTES[piece.sku] || "Runs true to the chart.") : null,
      how_to_measure: "Measure over bare skin, tape snug but not pulled: bust at the fullest point, waist at the narrowest, hips at the fullest. Between two sizes on a knit, take the larger; on linen, take the smaller.",
      note: recommended ? undefined : "Give me a bust, waist or hip measurement in centimetres and I will name the size rather than guess it.",
    };
  },

  shipping_and_returns: ({ destination }) => {
    const key = String(destination || "").toLowerCase();
    const shipping = SHIPPING[key] ? { [key]: SHIPPING[key] } : SHIPPING;
    return {
      dispatch: "Orders placed before 14:00 leave the studio the same business day.",
      shipping,
      returns: RETURNS,
      detail: "Sol & Salt is a demonstration shop: no parcel actually moves and no refund is actually paid.",
    };
  },

  start_return: ({ order_number, item, reason, note }) => {
    if (!order_number || !item || !reason) {
      return {
        error: "missing_details",
        detail: "An order number, which piece is going back, and a reason — the card above has all three.",
        needs: ["order_number", "item", "reason"].filter((f) => !({ order_number, item, reason })[f]),
      };
    }
    const ref = String(order_number).toUpperCase().trim();
    const order = orders.find((o) => o.number === ref);
    if (!order) return { error: "no_such_order", detail: `No order ${ref} on this account. The number is on the confirmation email, in the shape SS-00000.` };
    const window = returnWindow(order);
    if (window.reason === "not_delivered") {
      return { error: "not_delivered_yet", status: order.status, detail: `Order ${ref} has not been delivered yet, so there is nothing to send back. It can still be cancelled while it is ${order.status}.` };
    }
    if (!window.open) {
      return { error: "window_closed", window_closed: window.closes, detail: `Order ${ref} was delivered on ${order.delivered}, so its ${RETURNS.window_days}-day return window closed on ${window.closes}. A fabric or stitching fault is still covered for 12 months.` };
    }
    const line = order.items.find((i) => {
      const hay = `${i.sku} ${i.name}`.toLowerCase();
      return hay.includes(String(item).toLowerCase()) || String(item).toLowerCase().includes(i.name.toLowerCase());
    });
    if (!line) {
      return { error: "item_not_in_order", items: order.items.map((i) => `${i.name} (${i.sku}, ${i.colour}, ${i.size})`), detail: `That piece was not in order ${ref}.` };
    }
    const number = `RMA-${returnSeq++}`;
    const record = {
      return_number: number, order_number: ref, item: `${line.name} (${line.colour}, ${line.size})`,
      reason, note: note || null, raised: today(), status: "label on its way",
    };
    returnsRaised.push(record);
    return {
      return_number: number,
      status: "label on its way",
      item: record.item,
      window_closes: window.closes,
      refund: reason === "exchange-size"
        ? "No refund — the exchange size is held for 7 days while this one travels back."
        : RETURNS.refund,
      next_step: "The prepaid label lands in your inbox within a few minutes. Put the piece back in its bag with the hygiene liner in place, tags on.",
      detail: "Sol & Salt is a demonstration shop, so no label is actually emailed and no refund is actually paid.",
    };
  },

  get_my_orders: ({ email }) => {
    const mine = String(email ?? "").toLowerCase();
    const isDemo = mine === demoCustomer.email;
    const rows = orders.filter((o) => o.email.toLowerCase() === mine).map((o) => {
      const window = returnWindow(o);
      return {
        ...o,
        returnable_until: window.closes,
        can_return: window.open,
        can_cancel: o.status === "processing",
      };
    });
    return {
      customer: isDemo ? { name: demoCustomer.name, email: demoCustomer.email, since: "2024", orders: rows.length } : null,
      orders: rows,
      returns: returnsRaised.filter((r) => rows.some((o) => o.number === r.order_number)),
      note: rows.length ? undefined : "No orders on that address.",
    };
  },

  cancel_order: ({ order_number, email }) => {
    const ref = String(order_number ?? "").toUpperCase().trim();
    const mine = String(email ?? "").toLowerCase();
    if (!ref || !mine) return { error: "missing_details", detail: "An order number and the email it was placed under are both needed." };
    const order = orders.find((o) => o.number === ref && o.email.toLowerCase() === mine);
    if (!order) return { error: "no_such_order", detail: `No order ${ref} on that address.` };
    if (order.status !== "processing") {
      const window = returnWindow(order);
      return {
        error: "already_dispatched", status: order.status,
        detail: `Order ${ref} has already left the studio, so it cannot be cancelled${window.open ? " — it can be returned once it arrives, free within the United States." : "."}`,
      };
    }
    order.status = "cancelled";
    return {
      order_number: ref, status: "cancelled", refunded: `$${order.total}`,
      next_step: "The hold on the card drops off within 5 business days.",
      detail: "Sol & Salt is a demonstration shop, so nothing was actually charged or refunded.",
    };
  },
};

const SCHEMA = toolsFor(STORE_NAME);
const tools = Object.fromEntries(Object.entries(SCHEMA).map(([name, def]) => [name, { ...def, handler: HANDLERS[name] }]));

start({
  port: PORT,
  issuer: ISSUER,
  tenantId: TENANT_ID,
  keyDir: KEY_DIR,
  wellKnownDir: WELL_KNOWN_DIR,
  demoCustomer,
  tools,
  storeName: STORE_NAME,
  namespace: "solsalt",
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical (the
  // tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demo-meta" (sites/meta/demo.json `assistant`).
  hostedOrigins: ["https://demo-meta.busymate.ai", "https://busymate.ai"],
});
