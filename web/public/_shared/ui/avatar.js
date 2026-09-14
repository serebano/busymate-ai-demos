/*
 * Avatars without a face.
 *
 * A demo needs people on it — reviewers, a team — but a demo must never put a
 * real person's likeness behind an invented name. So every avatar here is drawn
 * from the name itself: initials on a colour derived from the same string, so
 * it is stable across reloads and identical on every demo that uses this.
 */
const PALETTE = [
  ["#8a4b26", "#f6e9d8"], ["#2f5d50", "#eaf4ef"], ["#5b4b8a", "#efeaf7"],
  ["#8a2f45", "#fbe9ee"], ["#2f4d8a", "#e9f0fb"], ["#7a6a1f", "#f7f2df"],
];

function hash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** A data-URI SVG avatar for `name`. No network, no likeness, no tracking. */
export function avatarUrl(name, size = 96) {
  const [bg, ink] = PALETTE[hash(name) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="${size}" height="${size}">`
    + `<rect width="96" height="96" rx="48" fill="${bg}"/>`
    + `<text x="48" y="61" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif"`
    + ` font-size="36" font-weight="600" fill="${ink}">${initials(name)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
