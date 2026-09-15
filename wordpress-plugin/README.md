# Busymate AI — WordPress plugin

This is the public source of the real, installable **Busymate AI** WordPress
plugin (GPL-2.0-or-later) — a self-serve `wp.org`-shaped plugin any
WordPress site can install and connect, distinct from the per-tenant zip
the Console generates for a WooCommerce storefront it already knows.

- Loads [`embed/v1.js`](https://busymate.ai/embed/v1.js) via
  `wp_enqueue_scripts` — never a hand-edited theme header.
- "Connect your account" — standards-only OAuth 2.0 (RFC 7591 dynamic
  client registration + RFC 7636 PKCE), no slug or key to copy and paste.
- A Gutenberg block and a `[bmai_assistant]` shortcode for an inline trigger
  button, with an optional starting question.
- An optional, read-only WooCommerce connection via WooCommerce's own
  `wc-auth/v1/authorize` app-authentication endpoint — no manually-generated
  key.
- No licence gate, quota, or trial: every feature works fully on every
  install. Billing lives entirely in the connected busymate.ai workspace.

See [`bmai-assistant/readme.txt`](bmai-assistant/readme.txt) for the full
plugin description, installation steps and FAQ (the `wp.org`-format
readme this plugin ships with).

Live: https://busymate.ai
