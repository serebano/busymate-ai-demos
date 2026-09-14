#!/usr/bin/env node
/**
 * A demo's photography, from freely-licensed originals to committed webp.
 *
 *   node sites/_shared/images/build-images.mjs <demo-name>
 *
 * Reads `sites/<name>/images.json` — a pinned list of Wikimedia Commons files,
 * never a live search, so the same command always produces the same pictures —
 * resolves each one's licence and author through the Commons API, downloads it
 * at the width the page needs, and writes an optimized `public/img/<id>.webp`
 * plus `IMAGE-CREDITS.md` naming every source, author and licence.
 *
 * Run it locally when the manifest changes and COMMIT the output: the box only
 * ever rsyncs `public/`, so nothing is built during a deploy.
 *
 * Needs `sips` (macOS) for the resize and `cwebp` for the encode.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const name = process.argv[2];
if (!name) { console.error("usage: build-images.mjs <demo-name>"); process.exit(2); }

const site = join(ROOT, "sites", name);
const manifest = JSON.parse(readFileSync(join(site, "images.json"), "utf8"));
const outDir = join(site, "public", "img");
const tmpDir = join(ROOT, ".image-cache");
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const API = "https://commons.wikimedia.org/w/api.php";
const UA = { "User-Agent": "busymate-ai-demo/1.0 (demo site image build)" };

const plain = (html) => String(html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Commons answers 429 to a tight loop, so back off rather than give up. */
async function politeFetch(url, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res;
    if (res.status !== 429 && res.status !== 503) throw new Error(`commons ${res.status}`);
    await pause(attempt * 2500);
  }
  throw new Error("commons kept rate-limiting us");
}

async function commonsInfo(titles, width) {
  const url = `${API}?action=query&titles=${encodeURIComponent(titles.join("|"))}`
    + `&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=${width}&format=json`;
  const res = await politeFetch(url);
  const body = await res.json();
  const out = new Map();
  for (const page of Object.values(body?.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata ?? {};
    out.set(page.title, {
      title: page.title,
      src: info.thumburl ?? info.url,
      descriptionUrl: info.descriptionurl,
      licence: plain(meta.LicenseShortName?.value) || "see source",
      author: plain(meta.Artist?.value) || "unknown",
      width: info.thumbwidth ?? info.width,
      height: info.thumbheight ?? info.height,
    });
  }
  return out;
}

const entries = [];
for (const item of manifest.images) {
  const width = item.width ?? 1200;
  // Ask Commons for a wider rendering than the box when the box is tall, so the
  // cover-crop has real pixels to take rather than an upscale.
  const fetchWidth = item.aspect && item.aspect < 1.4 ? Math.round(width * (1.5 / item.aspect)) : width;
  const info = (await commonsInfo([item.file], fetchWidth)).get(item.file);
  if (!info) { console.error(`  ! no Commons record for ${item.file}`); continue; }

  const target0 = join(outDir, `${item.id}.webp`);
  if (existsSync(target0) && !process.env.FORCE) {
    entries.push({ ...item, ...info, kb: Math.round(statSync(target0).size / 1024) });
    console.log(`  ${item.id}.webp  (kept — FORCE=1 to rebuild)`);
    await pause(400);
    continue;
  }

  const raw = join(tmpDir, `${item.id}.src`);
  const res = await politeFetch(info.src);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));

  // Crop to the aspect the layout reserves, then encode.
  //
  // `sips -c` PADS when the source is smaller than the crop box, so cropping a
  // 760x507 thumbnail to a 760x760 square produced black bars rather than a
  // square photograph. Scale to COVER the box first, then crop out of that.
  const target = join(outDir, `${item.id}.webp`);
  const resized = join(tmpDir, `${item.id}.png`);
  const height = item.aspect ? Math.round(width / item.aspect) : null;
  execFileSync("sips", ["-s", "format", "png", raw, "--out", resized], { stdio: "ignore" });
  if (height) {
    const dims = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", resized], { encoding: "utf8" });
    const srcW = Number(/pixelWidth:\s*(\d+)/.exec(dims)?.[1] ?? width);
    const srcH = Number(/pixelHeight:\s*(\d+)/.exec(dims)?.[1] ?? height);
    const scale = Math.max(width / srcW, height / srcH);
    if (scale !== 1) {
      execFileSync("sips", ["-z", String(Math.ceil(srcH * scale)), String(Math.ceil(srcW * scale)), resized],
        { stdio: "ignore" });
    }
    execFileSync("sips", ["-c", String(height), String(width), resized], { stdio: "ignore" });
  } else {
    execFileSync("sips", ["-Z", String(width), resized], { stdio: "ignore" });
  }
  execFileSync("cwebp", ["-q", String(item.quality ?? 78), "-m", "6", "-mt", resized, "-o", target],
    { stdio: "ignore" });
  rmSync(raw, { force: true });
  rmSync(resized, { force: true });

  const kb = Math.round(statSync(target).size / 1024);
  entries.push({ ...item, ...info, kb, height: height ?? null });
  console.log(`  ${item.id}.webp  ${width}px  ${kb} KB  ${info.licence}`);
  await pause(700);
}

writeFileSync(
  join(site, "IMAGE-CREDITS.md"),
  `# Image credits — ${manifest.title ?? name}\n\n`
  + "Every photograph on this demo comes from Wikimedia Commons under a free licence.\n"
  + "None of it is a real brand's asset, and no photograph is used to represent a\n"
  + "named person. Rebuild with `node sites/_shared/images/build-images.mjs "
  + `${name}\`.\n\n`
  + "| File | Used as | Author | Licence | Source |\n|---|---|---|---|---|\n"
  + entries
    .map((e) => `| \`img/${e.id}.webp\` | ${e.alt} | ${e.author} | ${e.licence} | [${e.title}](${e.descriptionUrl}) |`)
    .join("\n")
  + "\n",
);

writeFileSync(
  join(site, "public", "img", "manifest.json"),
  `${JSON.stringify(entries.map((e) => ({ id: e.id, alt: e.alt, width: e.width, height: e.height })), null, 2)}\n`,
);

console.log(`${name}: ${entries.length} images + IMAGE-CREDITS.md`);
