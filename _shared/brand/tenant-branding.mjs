#!/usr/bin/env node
/**
 * The demo's brand, as the workspace's white-label branding.
 *
 *   node sites/_shared/brand/tenant-branding.mjs <demo-name>
 *
 * Prints the exact `set_tenant_branding` payload for this demo, built from its
 * own `brand.json` and `demo.json`. A visitor should meet the BUSINESS's
 * assistant — its name, its mark, its colour, its greeting — not a generic one,
 * and this is the step that makes the two agree.
 *
 * It only PRINTS: no credential belongs in this repo, so an operator pipes the
 * payload into the management MCP as themselves:
 *
 *   node sites/_shared/brand/tenant-branding.mjs web        # review it
 *   …then call set_tenant_branding with that payload, and PUBLISH afterwards —
 *   publishing is a replace, so resend knowledge_sources in the same publish.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const name = process.argv[2];
if (!name) { console.error("usage: tenant-branding.mjs <demo-name>"); process.exit(2); }

const site = join(ROOT, "sites", name);
const brand = JSON.parse(readFileSync(join(site, "brand.json"), "utf8"));
const demo = JSON.parse(readFileSync(join(site, "demo.json"), "utf8"));
if (!demo.tenant_id) { console.error(`${name}: demo.json has no tenant_id`); process.exit(1); }

const origin = brand.siteUrl ?? `https://${demo.subdomain}.demo.busymate.ai`;

console.log(JSON.stringify({
  tenant_id: demo.tenant_id,
  branding: {
    productName: brand.name,
    assistantName: brand.assistantName ?? brand.shortName ?? brand.name,
    tagline: brand.tagline,
    logoUrl: `${origin}/img/mark.png`,
    supportUrl: brand.supportUrl ?? origin,
    accentColor: brand.accentColor,
    welcomeMessage: brand.welcomeMessage,
    personaAddendum: brand.personaAddendum,
  },
  confirm: true,
}, null, 2));
