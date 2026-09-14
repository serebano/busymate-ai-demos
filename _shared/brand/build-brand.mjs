#!/usr/bin/env node
/**
 * A demo's brand kit: one mark, every size the web wants.
 *
 *   node sites/_shared/brand/build-brand.mjs <demo-name>
 *
 * Reads `sites/<name>/brand.json` and `sites/<name>/brand/mark.svg` — an
 * INVENTED mark, never a real company's — and writes the favicon, the touch
 * icon, the square avatar the assistant wears, the wordmark lockup and the
 * social card into `public/`. Run it locally and commit the output; the box
 * only rsyncs `public/`.
 *
 * Rasterizing uses macOS `qlmanage`, so this is an authoring-machine step.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const name = process.argv[2];
if (!name) { console.error("usage: build-brand.mjs <demo-name>"); process.exit(2); }

const site = join(ROOT, "sites", name);
const brand = JSON.parse(readFileSync(join(site, "brand.json"), "utf8"));
const markSvg = readFileSync(join(site, "brand", "mark.svg"), "utf8");
const pub = join(site, "public");
const img = join(pub, "img");
const tmp = join(ROOT, ".brand-cache");
mkdirSync(img, { recursive: true });
mkdirSync(tmp, { recursive: true });

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/**
 * SVG → PNG at exactly `width` x `height`.
 *
 * qlmanage always returns a SQUARE thumbnail with the artwork letterboxed, so a
 * wide card has to be cropped back out of that square — scaling it would leave
 * bars down the sides of every social preview.
 */
function raster(svg, outPath, width, height = width) {
  const src = join(tmp, "in.svg");
  writeFileSync(src, svg);
  rmSync(join(tmp, "in.svg.png"), { force: true });
  execFileSync("qlmanage", ["-t", "-s", String(width), "-o", tmp, src], { stdio: "ignore" });
  const thumb = join(tmp, "in.svg.png");
  execFileSync("sips", ["-s", "format", "png", "-Z", String(width), thumb, "--out", outPath], { stdio: "ignore" });
  if (height !== width) {
    execFileSync("sips", ["-c", String(height), String(width), outPath], { stdio: "ignore" });
  }
}

// The mark, as the page's icon and as the assistant's avatar.
copyFileSync(join(site, "brand", "mark.svg"), join(pub, "favicon.svg"));
raster(markSvg, join(img, "mark.png"), 512);
raster(markSvg, join(pub, "apple-touch-icon.png"), 180);

// The lockup the header uses: mark + wordmark, on transparent.
const inner = markSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
writeFileSync(
  join(pub, "img", "logo.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 512" role="img" aria-label="${esc(brand.name)}">
  <title>${esc(brand.name)}</title>
  ${inner}
  <text x="596" y="292" font-family="ui-serif, Georgia, 'Times New Roman', serif" font-size="150"
        font-weight="600" letter-spacing="-4" fill="${brand.ink}">${esc(brand.shortName)}</text>
  <text x="600" y="372" font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="62" letter-spacing="6" fill="${brand.accentColor}">${esc(brand.tagline.toUpperCase())}</text>
</svg>\n`,
);

// The social card.
raster(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
    <defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${brand.gradient[0]}"/><stop offset="1" stop-color="${brand.gradient[1]}"/>
    </linearGradient></defs>
    <rect width="1200" height="630" fill="url(#og)"/>
    <g transform="translate(96 150) scale(0.52)">${inner.replace(/<rect[^>]*\/>/, "")}</g>
    <text x="96" y="470" font-family="ui-serif, Georgia, serif" font-size="76" font-weight="600"
          fill="${brand.ink}">${esc(brand.name)}</text>
    <text x="96" y="536" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34"
          fill="${brand.accentColor}">${esc(brand.tagline)}</text>
  </svg>`,
  join(img, "og.png"),
  1200,
  630,
);

rmSync(tmp, { recursive: true, force: true });
console.log(`${name}: favicon.svg, apple-touch-icon.png, img/mark.png, img/logo.svg, img/og.png`);
