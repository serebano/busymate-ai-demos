// sites/discord/backend/index.mjs — Pixelforge Games' data + tool handlers,
// plugged into the shared identity + generic-MCP server
// (sites/_shared/backend/mcp-identity-server.mjs takes NO studio assumptions —
// this file owns the games, the patch notes, the status board, the player's
// library and the handlers).
import { start } from "./_shared/mcp-identity-server.mjs";
import { toolsFor } from "./tool-schema.mjs";

const PORT = Number(process.env.PORT || 8113);
const ISSUER = process.env.ISSUER || "https://discord.demo.busymate.ai";
const TENANT_ID = process.env.TENANT_ID; // required, no fallback — fail loud if missing

if (!TENANT_ID) {
  console.error("TENANT_ID env var is required");
  process.exit(1);
}

const STORE_NAME = "Pixelforge Games";

const GAMES = [
  {
    id: "lumen-drift",
    name: "Lumen Drift",
    genre: "Atmospheric puzzle-platformer",
    price: 19.99,
    currency: "USD",
    platforms: ["Windows", "macOS", "Linux", "Handheld PC"],
    version: "1.8.2",
    released: "2024-11-07",
    state: "released",
    players: "single player, about 9 hours",
    pitch: "Carry the last light down through a drowned cave system. No combat, no timers — the light is the puzzle, and it burns down as you use it.",
  },
  {
    id: "ironroot-tactics",
    name: "Ironroot Tactics",
    genre: "Turn-based tactics with a roguelike campaign",
    price: 24.99,
    currency: "USD",
    platforms: ["Windows", "Linux", "Handheld PC"],
    version: "2.3.0",
    released: "2025-06-18",
    state: "released",
    players: "single player + 2-player hotseat, runs of 40-90 minutes",
    pitch: "Six squads, one dying forest, permanent losses. Every run reshuffles the map and the enemy doctrine, so no two campaigns rhyme.",
  },
  {
    id: "sundog-rally",
    name: "Sundog Rally",
    genre: "Arcade rally racer",
    price: 14.99,
    currency: "USD",
    platforms: ["Windows", "macOS"],
    version: "0.9.4",
    released: "2026-07-30",
    state: "early access",
    players: "single player + weekly leaderboards",
    pitch: "Eleven desert stages, one car you rebuild between runs, and a sun that sets while you drive. Early access: stages 12-16 and the replay editor are still to come.",
  },
];

// Public patch notes, newest first, as the site publishes them.
const PATCH_NOTES = [
  {
    game: "lumen-drift", version: "1.8.2", date: "2026-09-05", title: "Save integrity + ultrawide",
    lines: [
      "Fixed a save corruption that could strip Chapter 4 lantern upgrades when the game was closed from the pause menu during an autosave.",
      "Ultrawide (21:9 and 32:9) now letterboxes the cutscenes instead of cropping the top of the frame.",
      "Linux: fixed a crash on launch on systems with no PulseAudio server running.",
    ],
  },
  {
    game: "lumen-drift", version: "1.8.1", date: "2026-08-11", title: "Controller + accessibility",
    lines: [
      "Controller rumble can now be turned down rather than only off.",
      "Added a high-contrast lantern outline for low-vision players.",
      "Fixed the Chapter 2 checkpoint that could be reached without the second lens, soft-locking the chapter.",
    ],
  },
  {
    game: "ironroot-tactics", version: "2.3.0", date: "2026-08-28", title: "The Bramble Accord",
    lines: [
      "New squad: the Bramble Accord, four units built around terrain denial.",
      "Campaign: enemy doctrine now rerolls between acts, so a run can change shape at the halfway point.",
      "Balance: Ironroot Sapper mines cost 1 more action point; Warden overwatch no longer triggers through smoke.",
      "Fixed hotseat desync when both players undid a move in the same turn.",
    ],
  },
  {
    game: "ironroot-tactics", version: "2.2.7", date: "2026-07-14", title: "Quality of life",
    lines: [
      "Undo now covers the whole turn, not the last action.",
      "Fixed a crash when loading a campaign saved mid-cutscene on Handheld PC.",
      "Handheld PC: default text size raised; the unit card no longer clips at 800p.",
    ],
  },
  {
    game: "sundog-rally", version: "0.9.4", date: "2026-09-09", title: "Early access: stage 11 + wheel support",
    lines: [
      "Stage 11, Saltpan Run, is in.",
      "Force-feedback wheels are supported; the rebind screen now reads pedal axes correctly.",
      "Fixed the weekly leaderboard resetting an hour early in time zones east of UTC.",
      "Known issue: replays recorded before 0.9.4 will not load — the replay format changed and the editor is still being built.",
    ],
  },
  {
    game: "sundog-rally", version: "0.9.2", date: "2026-08-21", title: "Early access: handling pass",
    lines: [
      "Rear grip on gravel raised; the car no longer snaps sideways on a light lift.",
      "Fixed the sun flare blowing out the whole screen on the last two stages.",
    ],
  },
];

const STATUS = [
  { service: "Cloud saves", state: "operational" },
  { service: "Leaderboards", state: "degraded", note: "Sundog Rally weekly boards have been recalculating since 08:20 UTC — times are being recorded, they are just slow to appear." },
  { service: "Key redemption", state: "operational" },
  { service: "Store & checkout", state: "operational" },
  { service: "Patch delivery", state: "operational" },
];

const demoCustomer = {
  id: "cust_demo_pixelforge_01",
  name: "Kai Moreno",
  email: "kai@example.com",
  playerTag: "kaim#4471",
  since: "2024-11-09",
};

// In-memory demo library + bug reports. Seeded so get_my_purchases and
// search_patch_notes have something to show immediately; report_bug and
// request_refund append (reset on restart — a public demo, not a real store).
const purchases = [
  { receipt: "PF-40271", customerId: demoCustomer.id, email: demoCustomer.email, game: "lumen-drift", purchased: "2026-05-02", price: 19.99, playtimeHours: 11.4, lastPlayedBuild: "1.8.2", status: "owned" },
  { receipt: "PF-41188", customerId: demoCustomer.id, email: demoCustomer.email, game: "ironroot-tactics", purchased: "2026-08-19", price: 24.99, playtimeHours: 6.2, lastPlayedBuild: "2.2.7", status: "owned" },
  { receipt: "PF-41903", customerId: demoCustomer.id, email: demoCustomer.email, game: "sundog-rally", purchased: "2026-09-11", price: 14.99, playtimeHours: 0.6, lastPlayedBuild: "0.9.4", status: "owned" },
];
const bugs = [];
let bugSeq = 5120;
let refundSeq = 771;

const REFUND_WINDOW_DAYS = 14;
const REFUND_MAX_HOURS = 2;

const gameById = (id) => GAMES.find((g) => g.id === id);
const gameName = (id) => gameById(id)?.name ?? id;

/** Whole days between a YYYY-MM-DD purchase date and today, UTC. */
function daysSince(dateStr) {
  const then = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function matchesGame(entry, needle) {
  if (!needle) return true;
  const q = String(needle).toLowerCase().trim();
  return entry.game === q || gameName(entry.game).toLowerCase().includes(q);
}

const HANDLERS = {
  list_games: () => ({
    games: GAMES.map((g) => ({
      id: g.id, name: g.name, genre: g.genre, price: `$${g.price.toFixed(2)}`, platforms: g.platforms,
      current_version: g.version, released: g.released, state: g.state, players: g.players, about: g.pitch,
    })),
    note: "Sundog Rally is in early access — the price is lower and the content is not finished yet.",
  }),

  search_patch_notes: ({ query, game }) => {
    const q = String(query || "").toLowerCase().trim();
    const inScope = PATCH_NOTES.filter((e) => matchesGame(e, game));
    if (!q) return { entries: inScope.map((e) => ({ ...e, game: gameName(e.game) })) };
    const words = q.split(/\s+/).filter(Boolean);
    const hits = inScope
      .map((entry) => {
        const lines = entry.lines.filter((l) => words.some((w) => l.toLowerCase().includes(w)));
        const titleHit = words.some((w) => entry.title.toLowerCase().includes(w) || entry.version.includes(w));
        if (!lines.length && !titleHit) return null;
        return { game: gameName(entry.game), version: entry.version, date: entry.date, title: entry.title, lines: lines.length ? lines : entry.lines };
      })
      .filter(Boolean);
    return {
      entries: hits,
      ...(hits.length ? {} : { note: "Nothing in the published patch notes mentions that. If it is something broken, offer to file a bug report instead." }),
    };
  },

  get_server_status: () => ({
    checked_at: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    services: STATUS,
    open_incident: STATUS.filter((s) => s.state !== "operational").map((s) => `${s.service}: ${s.state} — ${s.note}`).join("; ") || "none",
  }),

  report_bug: ({ game, platform, what_happened, email }) => {
    if (!game || !platform || !what_happened || !email) {
      return { error: "missing_details", detail: "The game, the platform, what happened and an email are all needed to file a bug." };
    }
    if (!gameById(game)) return { error: "unknown_game", detail: `Pixelforge Games publishes ${GAMES.map((g) => g.name).join(", ")}.` };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "bad_email", detail: "That email address does not look right." };
    const id = `PF-BUG-${bugSeq++}`;
    bugs.push({ id, game, platform, what_happened, email, filed: new Date().toISOString().slice(0, 16).replace("T", " ") });
    return {
      bug_id: id,
      game: gameName(game),
      queue: `${gameName(game)} — ${gameById(game).version} triage`,
      next_step: "A developer reads every report in the weekly triage pass; you get a reply on that email either way.",
      detail: "Pixelforge Games is a demonstration studio, so no developer is actually paged.",
    };
  },

  get_my_purchases: ({ email }) => {
    const mine = String(email ?? "").toLowerCase();
    const rows = purchases.filter((p) => p.email.toLowerCase() === mine);
    return {
      player: mine === demoCustomer.email ? { name: demoCustomer.name, player_tag: demoCustomer.playerTag, since: demoCustomer.since } : null,
      purchases: rows.map((p) => {
        const g = gameById(p.game);
        return {
          receipt: p.receipt,
          game: g.name,
          purchased: p.purchased,
          paid: `$${p.price.toFixed(2)}`,
          playtime_hours: p.playtimeHours,
          last_played_build: p.lastPlayedBuild,
          current_build: g.version,
          update_available: p.lastPlayedBuild !== g.version,
          status: p.status,
          refundable: p.status === "owned" && daysSince(p.purchased) <= REFUND_WINDOW_DAYS && p.playtimeHours < REFUND_MAX_HOURS,
        };
      }),
      refund_policy: `A purchase can be refunded within ${REFUND_WINDOW_DAYS} days if it has been played for less than ${REFUND_MAX_HOURS} hours.`,
    };
  },

  request_refund: ({ receipt, email, reason }) => {
    const ref = String(receipt ?? "").toUpperCase().trim();
    const mine = String(email ?? "").toLowerCase();
    if (!ref || !mine) return { error: "missing_details", detail: "A receipt number and the email the purchase is under are both needed." };
    const row = purchases.find((p) => p.receipt === ref && p.email.toLowerCase() === mine);
    if (!row) return { error: "not_found", detail: "No purchase with that receipt number sits on that email." };
    if (row.status === "refunded") return { error: "already_refunded", detail: `${gameName(row.game)} was already refunded on this receipt.` };
    const days = daysSince(row.purchased);
    if (days > REFUND_WINDOW_DAYS || row.playtimeHours >= REFUND_MAX_HOURS) {
      return {
        error: "outside_refund_window",
        detail: `${gameName(row.game)} was bought ${days} days ago with ${row.playtimeHours} hours played, and the policy is ${REFUND_WINDOW_DAYS} days / under ${REFUND_MAX_HOURS} hours. A person at the studio can still look at it — offer to hand off.`,
        policy: `${REFUND_WINDOW_DAYS} days, under ${REFUND_MAX_HOURS} hours played`,
      };
    }
    row.status = "refund requested";
    const id = `PF-RF-${refundSeq++}`;
    return {
      refund_id: id,
      receipt: ref,
      game: gameName(row.game),
      amount: `$${row.price.toFixed(2)}`,
      status: "refund requested",
      next_step: "Refunds are processed in the next daily batch and the key stops working once they are.",
      reason: reason || null,
      detail: "Pixelforge Games is a demonstration studio, so no money actually moves.",
    };
  },
};

const SCHEMA = toolsFor(STORE_NAME);
const tools = Object.fromEntries(Object.entries(SCHEMA).map(([name, def]) => [name, { ...def, handler: HANDLERS[name] }]));

start({
  port: PORT,
  issuer: ISSUER,
  tenantId: TENANT_ID,
  keyDir: process.env.KEY_DIR ?? "/keys",
  wellKnownDir: process.env.WELLKNOWN_DIR ?? "/wellknown",
  demoCustomer,
  tools,
  storeName: STORE_NAME,
  namespace: "pixelforge",
  // The platform's hosted assistant page — <slug>.busymate.ai is canonical
  // (the tenant travels in the HOST) and the apex covers busymate.ai/chat/<id>
  // (#2865). This tenant's slug is "demo-discord" (sites/discord/demo.json `assistant`).
  hostedOrigins: ["https://demo-discord.busymate.ai", "https://busymate.ai"],
});
