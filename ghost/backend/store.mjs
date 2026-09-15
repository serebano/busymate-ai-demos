// sites/ghost/backend/store.mjs
//
// The Meridian Line has no catalogue or order book — its "identified"
// experience is a real Ghost Member (created via the Admin API during
// provisioning, see README "Recreating the site from scratch" step 4), a
// free-tier reader of the magazine. Same shape as wordpress's `jordan` and
// scan's `demoCustomer`: one PROVIDED, stable throwaway account.
export const demoCustomer = {
  id: "meridian-member-1",
  name: "Nadia Ferro",
  email: "nadia@ghost.demo.busymate.ai",
  since: "2026-06-01",
  note: "A free-tier Meridian Line member — created as a real Ghost Member via the Admin API, not just a mock object.",
};

export const CONTACT = {
  address: "The Meridian Line, 9 Foundry Yard, Sheffield S1 (editorial only, no drop-ins)",
  email: "editors@ghost.demo.busymate.ai",
  hours: "Newsletter every Thursday; editorial inbox answered Mon-Fri",
  note: "Demo publication — this address/email is not real.",
};
