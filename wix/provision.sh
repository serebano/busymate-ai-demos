#!/usr/bin/env bash
# Stand the Wix demo's backend up on the demo host (busymate-devtools#3012,
# program #2899, #2662). IDEMPOTENT — safe to re-run. No app/db container —
# the real site is Wix's own hosting (mrserebano.wixsite.com/wren-and-oat);
# this box runs ONLY this demo's MCP + identity + six-layer backend, same
# shape as webflow's would-be provision (never written) but simpler still:
# one container, one port.
set -euo pipefail

NAME=wix
PORT=8119
FQDN=wix.demo.busymate.ai
ROOT=<demo-host>/$NAME
KEYS=$ROOT/keys
ACME=$ROOT/acme
NET=demo-wix-net
REPO_DIR="${REPO_DIR:-<demo-host>/_repo}"
TPL="$REPO_DIR/infra/nginx"
CERT_EMAIL="${CERT_EMAIL:-admin@busymate.ai}"
CONF=/etc/nginx/sites-available/$FQDN.conf
TENANT_ID="$(jq -r '.tenant_id // empty' "$REPO_DIR/sites/$NAME/demo.json" 2>/dev/null || true)"

mkdir -p "$KEYS" "$ACME"
chmod 755 "$ROOT" "$ACME"
chmod 700 "$KEYS"

docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null

docker build -q -t demo-wix-backend -f "$REPO_DIR/sites/$NAME/backend/Dockerfile" "$REPO_DIR" >/dev/null
docker rm -f demo-wix-backend-c >/dev/null 2>&1 || true
docker run -d --name demo-wix-backend-c --restart unless-stopped \
  --network "$NET" \
  -p "127.0.0.1:${PORT}:${PORT}" \
  -e PORT="$PORT" \
  -e ISSUER="https://${FQDN}" \
  -e TENANT_ID="$TENANT_ID" \
  -e WIX_SITE_ORIGIN="https://mrserebano.wixsite.com/wren-and-oat" \
  -e TENANT_SLUG="wren-and-oat" \
  -v "$KEYS:/keys" \
  --memory 128m \
  demo-wix-backend >/dev/null

mkdir -p "$ACME/.well-known/acme-challenge"
chmod -R 755 "$ACME"
SITE_URL="https://mrserebano.wixsite.com/wren-and-oat"
SITE_ORIGIN="https://mrserebano.wixsite.com"
render() {
  sed -e "s#__FQDN__#${FQDN}#g" -e "s#__PORT__#${PORT}#g" -e "s#__ACME_ROOT__#${ACME}#g" -e "s#__SITE_URL__#${SITE_URL}#g" -e "s#__SITE_ORIGIN__#${SITE_ORIGIN}#g" "$1" >"$CONF"
  ln -sf "$CONF" "/etc/nginx/sites-enabled/${FQDN}.conf"
  nginx -t && systemctl reload nginx
}
if [ ! -f "/etc/letsencrypt/live/${FQDN}/fullchain.pem" ]; then
  render "$TPL/wix-http.conf.template"
  certbot certonly --webroot -w "$ACME" --non-interactive --agree-tos -m "$CERT_EMAIL" -d "$FQDN"
fi
render "$TPL/wix-https.conf.template"

docker ps --filter name=demo-wix-backend-c --format '{{.Names}}  {{.Status}}  {{.Ports}}'
echo "vhost   $CONF"
curl -sS -o /dev/null -w 'https://%{url.host}/mcp -> %{http_code}\n' -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' "https://$FQDN/mcp" 2>/dev/null || true
