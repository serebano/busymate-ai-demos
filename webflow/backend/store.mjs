// sites/webflow/backend/store.mjs
//
// Aldercroft Studio has no membership system of its own on Webflow's free
// Starter plan (Memberships is a paid-plan feature) — its "identified"
// experience is this one PROVIDED, stable throwaway account, same shape as
// ghost's `demoCustomer`/scan's `demoCustomer`, signed in via this backend's
// own /api/identity/start (the shared server's built-in demo-signin route).
export const demoCustomer = {
  id: "aldercroft-client-1",
  name: "Priya Nandakumar",
  email: "priya@aldercroft.demo.busymate.ai",
  since: "2026-07-14",
  note: "A prospective client with an open project inquiry — a real throwaway demo account, not a Webflow Membership (unavailable on the Starter plan).",
  project: {
    reference: "AC-1042",
    interest: "Urban Apartment Living",
    stage: "Consultation requested — awaiting scheduling",
  },
};
