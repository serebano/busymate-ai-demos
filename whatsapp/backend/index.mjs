// sites/whatsapp/backend/index.mjs — Marlow's Kitchen's data + tool
// handlers, plugged into the shared identity + generic-MCP server
// (sites/_shared/backend/mcp-identity-server.mjs takes NO menu/booking
// assumptions — this file owns the restaurant shape and the handlers).
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./tool-schema.mjs";

const PORT = Number(process.env.PORT || 8102);
const ISSUER = process.env.ISSUER || "https://whatsapp.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const STORE_NAME = "Marlow's Kitchen";

// Tue-Thu dinner only, Fri-Sun lunch/brunch + dinner, closed Monday.
const HOURS = {
  Mon: null,
  Tue: [{ label: "Dinner", open: "17:00", close: "22:00" }],
  Wed: [{ label: "Dinner", open: "17:00", close: "22:00" }],
  Thu: [{ label: "Dinner", open: "17:00", close: "22:00" }],
  Fri: [{ label: "Lunch", open: "12:00", close: "15:00" }, { label: "Dinner", open: "17:00", close: "23:00" }],
  Sat: [{ label: "Lunch", open: "12:00", close: "15:00" }, { label: "Dinner", open: "17:00", close: "23:00" }],
  Sun: [{ label: "Brunch", open: "11:00", close: "15:00" }, { label: "Dinner", open: "17:00", close: "21:00" }],
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MENU = [
  {
    section: "Starters",
    items: [
      { id: "harvest-bowl", name: "Harvest Grain Bowl", price: 14, tags: ["vegetarian", "vegan"], description: "Roasted sweet potato, chickpea, avocado, citrus tahini." },
      { id: "whipped-feta", name: "Charred Bread & Whipped Feta", price: 9, tags: ["vegetarian"], description: "Wood-fired sourdough, whipped feta, chili oil." },
      { id: "soup-of-day", name: "Soup of the Day", price: 8, tags: ["vegetarian"], description: "Changes daily — ask your server, or ask Marlow." },
    ],
  },
  {
    section: "Mains",
    items: [
      { id: "short-rib-tagliatelle", name: "Braised Short Rib Tagliatelle", price: 26, tags: [], description: "Slow-braised short rib, fresh tagliatelle, salsa verde." },
      { id: "roast-chicken", name: "Roast Chicken, Salsa Verde", price: 23, tags: ["gluten-free option"], description: "Half chicken, charred lemon, herb salsa verde." },
      { id: "mushroom-risotto", name: "Wood-Fired Mushroom Risotto", price: 21, tags: ["vegetarian", "gluten-free"], description: "Wild mushroom, parmesan, thyme." },
      { id: "marlows-burger", name: "Marlow's Burger & Fries", price: 19, tags: ["shareable"], description: "House blend, aged cheddar, burnt-onion mayo — a terrace favorite, good for sharing." },
    ],
  },
  {
    section: "Weekend Brunch (Fri–Sun until 15:00)",
    items: [
      { id: "full-marlow", name: "The Full Marlow", price: 18, tags: [], description: "Eggs your way, bacon, a waffle, seasonal fruit." },
      { id: "avo-sourdough", name: "Avocado on Sourdough", price: 13, tags: ["vegetarian"], description: "Smashed avocado, chili flake, lemon, sourdough." },
    ],
  },
  {
    section: "Terrace & Bar",
    items: [
      { id: "smoked-old-fashioned", name: "Smoked Old Fashioned", price: 13, tags: ["cocktail"], description: "Bourbon, demerara, orange, applewood smoke." },
      { id: "house-negroni", name: "House Negroni", price: 12, tags: ["cocktail"], description: "Equal-parts classic, Marlow's house gin." },
      { id: "seasonal-spritz", name: "Seasonal Spritz", price: 11, tags: ["cocktail"], description: "Changes with the season — ask what's pouring." },
    ],
  },
  {
    section: "Desserts",
    items: [
      { id: "salted-caramel-sundae", name: "Salted Caramel Sundae", price: 9, tags: ["vegetarian"], description: "Vanilla, warm salted caramel, brownie, wafer." },
      { id: "basque-cheesecake", name: "Basque Cheesecake", price: 8, tags: ["vegetarian"], description: "Burnt-top Basque style, single slice." },
    ],
  },
];
const ALL_ITEMS = MENU.flatMap((s) => s.items.map((i) => ({ ...i, section: s.section })));

const demoCustomer = { id: "cust_demo_marlow_01", name: "Riley Chen", email: "riley@example.com", phone: "+1-555-0142" };

// In-memory demo reservations. Seeded with two so get_my_reservations has
// something to show immediately; book_table appends more (reset on restart —
// this is a public demo, not a real booking system).
const reservations = [
  { code: "MK-58231", customerId: demoCustomer.id, name: demoCustomer.name, phone: demoCustomer.phone, date: "2026-09-18", time: "19:30", partySize: 2, status: "confirmed", notes: "Corner booth requested" },
  { code: "MK-55010", customerId: demoCustomer.id, name: demoCustomer.name, phone: demoCustomer.phone, date: "2026-08-02", time: "18:00", partySize: 4, status: "completed", notes: null },
];
let bookingSeq = 58232;

function dayKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return DAY_NAMES[d.getUTCDay()];
}

function withinService(dateStr, time) {
  const key = dayKey(dateStr);
  if (!key) return { ok: false, reason: "bad_date" };
  const windows = HOURS[key];
  if (!windows) return { ok: false, reason: "closed_that_day", day: key };
  const inWindow = windows.some((w) => time >= w.open && time <= w.close);
  return { ok: inWindow, reason: inWindow ? null : "outside_service_hours", day: key, windows };
}

// A little realism: Friday/Saturday dinner between 19:00-20:00 is "full" for
// parties of 6+, so check_availability has something genuine to say no to
// and suggest around, instead of always saying yes.
function isPeakFull(dateStr, time, partySize) {
  const key = dayKey(dateStr);
  return (key === "Fri" || key === "Sat") && time >= "19:00" && time <= "20:00" && partySize >= 6;
}

function suggestTimes(time) {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  return [mins - 45, mins + 45].map((t) => {
    const hh = Math.floor(((t % 1440) + 1440) % 1440 / 60).toString().padStart(2, "0");
    const mm = (((t % 1440) + 1440) % 1440 % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  });
}

const HANDLERS = {
  opening_hours: () => ({ hours: HOURS, note: "Closed Monday. Weekend brunch runs Fri–Sun until 15:00." }),
  list_menu: () => ({ menu: MENU }),
  search_menu: ({ query }) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return { results: ALL_ITEMS };
    return {
      results: ALL_ITEMS.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q)),
      ),
    };
  },
  check_availability: ({ date, time, party_size }) => {
    const service = withinService(date, time);
    if (!service.ok) {
      return { available: false, reason: service.reason, day: service.day, windows: service.windows || null };
    }
    if (isPeakFull(date, time, party_size)) {
      return { available: false, reason: "fully_booked_that_slot", suggested_times: suggestTimes(time) };
    }
    return { available: true, day: service.day };
  },
  book_table: ({ date, time, party_size, name, phone, notes }) => {
    const service = withinService(date, time);
    if (!service.ok) return { error: service.reason, day: service.day };
    if (isPeakFull(date, time, party_size)) return { error: "fully_booked_that_slot", suggested_times: suggestTimes(time) };
    if (!name || !phone) return { error: "name_and_phone_required" };
    const code = `MK-${bookingSeq++}`;
    const customerId = phone === demoCustomer.phone ? demoCustomer.id : null;
    const reservation = { code, customerId, name, phone, date, time, partySize: party_size, status: "confirmed", notes: notes || null };
    reservations.push(reservation);
    return { confirmation_code: code, status: "confirmed", reservation };
  },
  get_my_reservations: ({ phone }) => {
    const mine = reservations.filter((r) => r.phone === phone);
    return { reservations: mine };
  },
  cancel_reservation: ({ confirmation_code, phone }) => {
    const r = reservations.find((x) => x.code === confirmation_code);
    if (!r) return { error: "no_such_reservation" };
    if (r.phone !== phone) return { error: "phone_does_not_match_reservation" };
    r.status = "cancelled";
    return { confirmation_code, status: "cancelled" };
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
