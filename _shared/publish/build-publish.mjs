#!/usr/bin/env node
/**
 * One publish payload for a demo, with every section the runtime actually reads.
 *
 *   node sites/_shared/publish/build-publish.mjs <demo-name> [knowledge.json]
 *
 * Publishing a workspace REPLACES its config, so a partial payload silently
 * removes whatever it left out — that is how this demo lost its embed origins
 * (and with them its widget, behind `frame-ancestors 'self'`) and its identity
 * provider in the same publish. This builds the WHOLE thing from the demo's own
 * brand.json, demo.json and knowledge, every time.
 *
 * The section names are the runtime's, not the read-back view's: `channels` is
 * `hostedWeb`/`embedOrigins`, `access` is `guestEnabled`/`allowedOrigins`,
 * identity is `identity.providers` with FULL provider objects, connectors are
 * `integrations.connectorIds`, and a starter pill needs both a label AND a
 * prompt. The projected config you read back is a lossy summary of this.
 *
 *   node sites/_shared/knowledge/build-knowledge.mjs web > /tmp/k.json
 *   node sites/_shared/publish/build-publish.mjs web /tmp/k.json > /tmp/publish.json
 *   …then call publish_tenant_runtime with it, as the operator.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const [, , name, knowledgePath] = process.argv;
if (!name) { console.error("usage: build-publish.mjs <demo-name> [knowledge.json]"); process.exit(2); }

const site = join(ROOT, "sites", name);
const demo = JSON.parse(readFileSync(join(site, "demo.json"), "utf8"));
const brand = JSON.parse(readFileSync(join(site, "brand.json"), "utf8"));
const publishCfg = existsSync(join(site, "publish.json"))
  ? JSON.parse(readFileSync(join(site, "publish.json"), "utf8"))
  : {};
const knowledge = knowledgePath ? JSON.parse(readFileSync(knowledgePath, "utf8")) : [];

const origin = brand.siteUrl ?? `https://${demo.subdomain}.demo.busymate.ai`;
const origins = [origin, ...(publishCfg.extraOrigins ?? ["https://demo.busymate.ai"])];

const config = {
  brand: {
    productName: brand.name,
    assistantName: brand.assistantName ?? brand.shortName ?? brand.name,
    ...(brand.tagline ? { tagline: brand.tagline } : {}),
    logoLightUrl: `${origin}/img/mark.png`,
    logoDarkUrl: `${origin}/img/mark.png`,
    faviconUrl: `${origin}/img/mark.png`,
    ...(brand.accentColor ? { accentColor: brand.accentColor } : {}),
    ...(brand.welcomeMessage ? { welcomeMessage: brand.welcomeMessage } : {}),
    ...(brand.supportUrl ? { supportUrl: brand.supportUrl } : {}),
    // A starter pill carries BOTH the words on the button and the words it sends.
    ...(publishCfg.suggestions ? { suggestions: publishCfg.suggestions } : {}),
  },
  access: {
    guestEnabled: true,
    allowedOrigins: origins,
    // Spelled out rather than left to a default: an omitted spend limit is how
    // this demo talked itself into "AI usage limit reached or could not be
    // verified" on every turn after a publish that left the section bare.
    retentionDays: publishCfg.retentionDays ?? 90,
    rateLimitPerHour: publishCfg.rateLimitPerHour ?? 600,
    spendLimitUsdMonthly: publishCfg.spendLimitUsdMonthly ?? 50,
  },
  channels: { hostedWeb: true, embed: true, ios: false, android: false, embedOrigins: origins },
  ...(publishCfg.identityProvider
    ? { identity: { providers: [{ ...publishCfg.identityProvider, tenantClaimValue: demo.tenant_id }] } }
    : {}),
  ...(publishCfg.connectorIds ? { integrations: { connectorIds: publishCfg.connectorIds } } : {}),
  // The `support` module is what makes a workspace a support desk rather than a
  // neutral product assistant — and hand-off lives inside it. Omit the section
  // and the chat's own "Request a human" answers "human handoff is not enabled",
  // which is how this demo shipped a hand-off nobody could actually use.
  ...(publishCfg.handoff === false ? {} : {
    support: {
      queueName: publishCfg.queueName ?? `${brand.shortName ?? brand.name} inbox`,
      handoffEnabled: true,
      assignment: "manual",
      escalationMinutes: publishCfg.escalationMinutes ?? 30,
      businessHoursTimezone: publishCfg.timezone ?? "UTC",
    },
  }),
};

console.error(`${name}: brand + ${knowledge.length} knowledge sources`
  + `${config.identity ? " + identity" : ""}${config.integrations ? " + connector" : ""}`);
console.log(JSON.stringify({
  tenant_id: demo.tenant_id,
  config,
  knowledge_sources: knowledge,
  embed_origins: origins,
  launch_origins: origins,
  confirm: true,
}, null, 2));
