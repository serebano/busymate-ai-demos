/**
 * An action card in the chat, instead of a list of things to type.
 *
 * When the assistant needs structured details — an order number, a reason for a
 * return, a name and an email — prose asking for them is a worse interface than
 * a form. The platform already has the mechanism for this and it is not
 * ours: a tool attaches `_meta.ui.resourceUri` pointing at a `ui://` resource,
 * the host mounts that resource in the message, and the mounted view calls
 * `tools/call` back over the frame bridge when the visitor submits. A host that
 * reads `_meta.ui` renders a partner's widget with no change on its side, so
 * this works the same way for every demo.
 *
 * This module turns one JSON-Schema-shaped field list into both halves: the
 * `_meta` a tool advertises, and the self-contained HTML document the host
 * mounts. No framework, no network, no styling opinions beyond the host's own
 * colours, which arrive as CSS variables.
 */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

/** The `ui://` identity of one tool's card. */
export function formCardUri(namespace, toolName) {
  return `ui://widget/${namespace}-${toolName}.html`;
}

/**
 * The `_meta` a tool carries so a host knows it has a card.
 * Both spellings are emitted: the spec's nested `ui` and the deprecated flat
 * key the reference SDK still writes, because hosts read one or the other.
 */
export function formCardMeta(namespace, toolName) {
  const uri = formCardUri(namespace, toolName);
  return {
    "ui/resourceUri": uri,
    ui: { resourceUri: uri, visibility: ["model", "app"] },
    "openai/outputTemplate": uri,
    "openai/widgetAccessible": true,
  };
}

function field(spec) {
  const id = `f_${spec.name}`;
  const required = spec.required ? " required" : "";
  const label = `<label for="${id}">${esc(spec.label)}${spec.required ? "" : ' <span class="opt">optional</span>'}</label>`;
  let control;
  if (spec.type === "select") {
    control = `<select id="${id}" name="${esc(spec.name)}"${required}>`
      + (spec.required ? "" : `<option value="">—</option>`)
      + spec.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")
      + `</select>`;
  } else if (spec.type === "textarea") {
    control = `<textarea id="${id}" name="${esc(spec.name)}" rows="3"`
      + ` placeholder="${esc(spec.placeholder ?? "")}"${required}></textarea>`;
  } else {
    control = `<input id="${id}" name="${esc(spec.name)}" type="${esc(spec.type ?? "text")}"`
      + ` placeholder="${esc(spec.placeholder ?? "")}"${required}>`;
  }
  const help = spec.help ? `<p class="help">${esc(spec.help)}</p>` : "";
  return `<div class="row">${label}${control}${help}</div>`;
}

/**
 * The mounted document.
 *
 * It renders the form, and on submit calls the SAME tool again with the
 * collected values through the host's bridge. Whatever comes back is shown in
 * place of the form, so the card is the whole interaction rather than a step
 * before one.
 */
export function formCardHtml({ toolName, title, intro, submitLabel = "Send", fields, resultKeys }) {
  return `<!doctype html>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { margin: 0; font-size: 14px; line-height: 1.5; color: var(--bm-ink, inherit); }
  .card { border: 1px solid var(--bm-line, color-mix(in srgb, currentColor 16%, transparent));
          border-radius: 14px; padding: 16px; background: var(--bm-card, transparent); }
  h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: -.01em; }
  .intro { margin: 0 0 14px; opacity: .72; }
  .row { display: grid; gap: 5px; margin-bottom: 12px; }
  label { font-size: 12px; font-weight: 600; letter-spacing: .01em; }
  .opt { font-weight: 400; opacity: .55; }
  input, select, textarea {
    font: inherit; color: inherit; background: var(--bm-field, color-mix(in srgb, currentColor 6%, transparent));
    border: 1px solid var(--bm-line, color-mix(in srgb, currentColor 18%, transparent));
    border-radius: 9px; padding: 9px 11px; width: 100%; box-sizing: border-box;
  }
  input:focus, select:focus, textarea:focus { outline: 2px solid var(--bm-accent, #c9822f); outline-offset: 1px; }
  textarea { resize: vertical; }
  .help { margin: 0; font-size: 11.5px; opacity: .6; }
  button { font: inherit; font-weight: 600; font-size: 13.5px; cursor: pointer; border: 0; border-radius: 999px;
           padding: 10px 18px; background: var(--bm-accent, #c9822f); color: var(--bm-accent-ink, #1a120b); }
  button[disabled] { opacity: .55; cursor: progress; }
  .done { display: grid; gap: 6px; }
  .done dt { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; opacity: .6; }
  .done dd { margin: 0 0 8px; }
  .error { color: #c2410c; margin: 10px 0 0; }
  @media (max-width: 420px) { .card { padding: 13px; border-radius: 12px; } button { width: 100%; } }
</style>
<div class="card">
  <h2>${esc(title)}</h2>
  <p class="intro">${esc(intro)}</p>
  <form id="f">
    ${fields.map(field).join("\n    ")}
    <button type="submit">${esc(submitLabel)}</button>
  </form>
  <div id="out" hidden></div>
</div>
<script>
(function () {
  var TOOL = ${JSON.stringify(toolName)};
  var KEYS = ${JSON.stringify(resultKeys ?? null)};
  var form = document.getElementById("f");
  var out = document.getElementById("out");
  var seq = 0;
  var pending = {};

  // The host answers over the same channel it speaks on; a view never fetches.
  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0" || !(msg.id in pending)) return;
    var resolve = pending[msg.id];
    delete pending[msg.id];
    resolve(msg);
  });

  function callTool(args) {
    return new Promise(function (resolve, reject) {
      var id = "fc" + (++seq);
      pending[id] = resolve;
      try {
        window.parent.postMessage(
          { jsonrpc: "2.0", id: id, method: "tools/call", params: { name: TOOL, arguments: args } },
          "*"
        );
      } catch (err) { reject(err); }
      setTimeout(function () {
        if (id in pending) { delete pending[id]; reject(new Error("no answer from the page")); }
      }, 15000);
    });
  }

  function readResult(msg) {
    var content = msg && msg.result && msg.result.content;
    if (!Array.isArray(content)) return null;
    for (var i = 0; i < content.length; i++) {
      if (content[i] && typeof content[i].text === "string") {
        try { return JSON.parse(content[i].text); } catch (e) { return { message: content[i].text }; }
      }
    }
    return null;
  }

  function show(data) {
    form.hidden = true;
    out.hidden = false;
    if (!data) { out.innerHTML = '<p class="intro">Sent.</p>'; return; }
    var rows = (KEYS || Object.keys(data)).filter(function (k) {
      return data[k] !== undefined && data[k] !== null && typeof data[k] !== "object";
    });
    out.innerHTML = '<dl class="done">' + rows.map(function (k) {
      var label = k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, function (c) { return c.toUpperCase(); });
      return "<dt>" + label + "</dt><dd>" + String(data[k]).replace(/[<>&]/g, "") + "</dd>";
    }).join("") + "</dl>";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector("button");
    button.disabled = true;
    var args = {};
    new FormData(form).forEach(function (value, key) {
      if (String(value).trim() !== "") args[key] = String(value);
    });
    callTool(args).then(function (msg) {
      if (msg.error) throw new Error(msg.error.message || "that did not work");
      show(readResult(msg));
    }).catch(function (err) {
      button.disabled = false;
      var p = document.createElement("p");
      p.className = "error";
      p.textContent = err.message;
      form.appendChild(p);
    });
  });
})();
</script>
`;
}
