/*
 * The capability blocks at the foot of the page.
 *
 * One entry per thing this demo actually does. #2662 follow-up — `prompt` is
 * sent straight into the widget via `window.BusymateAI.ask()`: one tap opens
 * the chat, fills the composer with the exact prompt, and submits it, so a
 * visitor never retypes or pastes anything. `how` is the exact instructions
 * for doing the same on their own site.
 */
export const FEATURES = [
  {
    title: "The chat, from one script tag",
    body: "The bubble in the corner is the live product on a workspace of its own — not a recording and not a mock-up. One line in the page's HTML put it there.",
    prompt: "What would you recommend if I like chocolatey espresso?",
    how: { href: "https://busymate.ai/docs/getting-started", label: "Set up your own workspace" },
  },
  {
    title: "Grounded in Northwind's own words",
    body: "Delivery, returns, the subscription and the brew guide were published to the workspace as text. Answers quote that text and cite it; anything outside it gets an honest \"I don't know\".",
    prompt: "How long does delivery take to Canada, and what does it cost?",
    how: { href: "https://busymate.ai/docs/guides/knowledge", label: "Teach it your content" },
  },
  {
    title: "It can work the page",
    body: "This storefront publishes five of its own actions — search the range, add to the cart, read the cart, check an order, start a return. Ask for one and watch the cart in the header move.",
    prompt: "Add a bag of the Ethiopian to my cart",
    how: { href: "https://busymate.ai/docs/guides/page-tools", label: "Publish your page's actions" },
  },
  {
    title: "It can reach the systems behind the page",
    body: "Northwind also runs a small MCP server of its own, registered on the workspace as a connection. The catalogue and the policies come from there over HTTPS, so the answer is the same whether or not this tab is open.",
    prompt: "Which of your coffees is lowest in acidity, and is it in stock?",
    how: { href: "https://busymate.ai/docs/guides/connect-mcp-server", label: "Connect your own server" },
  },
  {
    title: "It knows who is signed in",
    body: "Sign in as the demo customer and this site signs a 120-second proof of who that is. The order book opens up straight away — through the page's own tools, for that one customer and nobody else.",
    prompt: "Where is my order?",
    how: { href: "https://busymate.ai/docs/guides/identified-visitors", label: "Recognise your signed-in customers" },
    needsSignIn: true,
    extra: { kind: "hosted", label: "Open the same conversation full-page" },
  },
  {
    title: "A person can take over",
    body: "Ask for a human and the thread lands in the team Inbox, where a colleague joins the conversation the visitor is already in — same messages, no restart, no ticket number.",
    prompt: "Can I speak to someone about a bag that arrived split?",
    how: { href: "https://busymate.ai/docs/guides/human-handoff-setup", label: "Staff your Inbox" },
  },
  {
    title: "Readable without a browser",
    body: "An agent that never renders this page can still work with it: a one-page brief, a Markdown twin of every page, a manifest of what this site offers, and the published tool list.",
    files: ["/llms.txt", "/agents.json", "/index.md", "/webmcp-catalog.json"],
    how: {
      href: "https://busymate.ai/articles/is-your-website-agent-ready-checklist",
      label: "The six layers, checked",
    },
  },
  {
    title: "Useful before anyone signs in",
    body: "Signed out, the catalogue, the prices and every policy are still answerable — to a visitor and to any agent. Only the order book waits for a proof of who is asking.",
    prompt: "What do you sell, and what does delivery cost?",
    how: { href: "https://busymate.ai/docs/guides/public-tools", label: "What stays open to everyone" },
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function renderFeatures(mount, { onTry, onHosted }) {
  mount.innerHTML = FEATURES.map((f, i) => {
    const tryRow = f.prompt
      ? `<div class="try"><span>Try it: “${esc(f.prompt)}”</span>
           <button class="btn tiny" type="button" data-try="${i}">Open in chat</button></div>`
      : "";
    const files = f.files
      ? `<div class="files">${f.files.map((p) => `<a href="${p}">${p}</a>`).join("")}</div>`
      : "";
    const extra = f.extra
      ? `<div class="files"><button class="btn tiny" type="button" data-hosted="1">${esc(f.extra.label)}</button></div>`
      : "";
    return `<article class="feature">
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.body)}</p>
      ${tryRow}${files}${extra}
      <a class="how" href="${f.how.href}">${esc(f.how.label)} →</a>
    </article>`;
  }).join("");

  mount.querySelectorAll("[data-try]").forEach((b) =>
    b.addEventListener("click", () => onTry(FEATURES[Number(b.dataset.try)])),
  );
  mount.querySelectorAll("[data-hosted]").forEach((b) => b.addEventListener("click", onHosted));
}
