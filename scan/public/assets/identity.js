/*
 * Visitor identity, half one: the embed.
 *
 * Defined BEFORE the embed script loads, because the widget asks for an
 * identity the moment it launches. getIdentity mints a fresh single-use proof
 * from Beacon's own API for a signed-in visitor, and answers null for a
 * signed-out one. Nothing is kept: no token, no nonce, no storage, no state.
 */
(function () {
  var api = (window.BusymateAI = window.BusymateAI || {});

  function freshNonce() {
    var bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode.apply(null, bytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  api.getIdentity = function () {
    return fetch("/api/identity/mint", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nonce: freshNonce() }),
    })
      .then(function (res) { return res.status === 201 ? res.json() : null; })
      .then(function (body) {
        if (!body || typeof body.token !== "string" || typeof body.nonce !== "string") return null;
        return { token: body.token, nonce: body.nonce };
      })
      .catch(function () { return null; });
  };
})();
