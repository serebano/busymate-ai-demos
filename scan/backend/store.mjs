// sites/scan/backend/store.mjs
//
// Beacon has no products or orders — its "identified" experience is a scan
// history, so a signed-in visitor sees this session's memory of what it has
// already looked up (not a mock catalogue).
export const demoCustomer = {
  id: "beacon-demo-1",
  name: "Jordan Blake",
  email: "jordan@beacon-demo.example",
  since: "2026-09-01",
};

export const EXAMPLES = {
  "busydrivers.com": { label: "BusyDrivers", tryUrl: "https://busymate.ai/try/busydrivers.com" },
  "web.demo.busymate.ai": { label: "Northwind Coffee", tryUrl: "https://busymate.ai/try/web.demo.busymate.ai" },
  "shopify.demo.busymate.ai": { label: "Northline Outdoor", tryUrl: "https://busymate.ai/try/shopify.demo.busymate.ai" },
};

/** Per-customer scan memory, in process only — a public demo, not an account system. */
const scanLog = new Map();

export function recordScan(customerId, host) {
  if (!customerId) return;
  const list = scanLog.get(customerId) ?? [];
  list.unshift({ host, at: new Date().toISOString() });
  scanLog.set(customerId, list.slice(0, 10));
}

export function scansFor(customerId) {
  return customerId ? (scanLog.get(customerId) ?? []) : [];
}

function normalizeHost(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

export { normalizeHost };
