// sites/wix/backend/store.mjs
//
// Wren & Oat Bakery has no membership system reachable from this backend —
// Wix Members Area sign-in is a client-side (Velo/`wix-members`) surface,
// not something a plain server-side backend can authenticate against, so
// its "identified" experience is this one PROVIDED, stable throwaway
// account, same shape as ghost's/webflow's `demoCustomer`, signed in via
// this backend's own /api/identity/start (the shared server's built-in
// demo-signin route).
export const demoCustomer = {
  id: "wren-oat-client-1",
  name: "Jonah Ruiz",
  email: "jonah@wren-oat.demo.busymate.ai",
  since: "2026-08-02",
  note: "A regular customer with a standing weekend order — a real throwaway demo account, not a Wix Member.",
  order: {
    reference: "WO-3391",
    items: ["Country sourdough loaf", "Almond croissant x2"],
    pickup: "Saturday, 9:00am",
  },
};
