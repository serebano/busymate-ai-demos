#!/usr/bin/env bash
# Stand the Ghost CMS demo up on the demo host (busymate-devtools#2979,
# program #2899). IDEMPOTENT — safe to re-run. Ghost's own docs say
# `database__connection__filename` (SQLite) is dev-mode only, so — same
# posture as wordpress/woo — this runs Ghost in production against a real
# MySQL 8 container (Ghost requires MySQL, not MariaDB).
#
# security__staffDeviceVerification=false: Ghost 5.next emails a one-time
# auth code on the FIRST admin session login from a new device/IP. This box
# has no SMTP relay (and DO blocks outbound :25 by default) so that send
# blocks the request for 2 minutes then 500s — confirmed live (Sept 2026):
# "Failed to send email… EmailError… sendAuthCodeToUser". Disabling it is the
# documented escape hatch for a self-host with no mail configured; the box's
# Admin API is reachable ONLY from its own docker network in the first place
# (the public vhost 404s /ghost/), so this doesn't weaken the public posture.
set -euo pipefail

NAME=ghost
PORT=8116
MCP_PORT=8117
FQDN=ghost.demo.busymate.ai
ROOT=<demo-host>/$NAME
DATA=$ROOT/data
ACME=$ROOT/acme
NET=demo-ghost-net
REPO_DIR="${REPO_DIR:-<demo-host>/_repo}"
TPL="$REPO_DIR/infra/nginx"
CERT_EMAIL="${CERT_EMAIL:-admin@busymate.ai}"
CONF=/etc/nginx/sites-available/$FQDN.conf

mkdir -p "$DATA/db" "$DATA/content" "$ACME"
chmod 755 "$ROOT" "$ACME"
if [ ! -f "$DATA/.env" ]; then
  umask 077
  {
    echo "MYSQL_DB=ghost"
    echo "MYSQL_USER=ghost"
    echo "MYSQL_PASS=$(openssl rand -hex 24)"
    echo "MYSQL_ROOT_PASS=$(openssl rand -hex 24)"
    echo "GHOST_ADMIN_USER=meridian_ops@ghost.demo.busymate.ai"
    echo "GHOST_ADMIN_PASS=$(openssl rand -base64 21 | tr -d '/+=')Aa1!"
    # Demo member — a PROVIDED, stable throwaway Ghost Member (same convention
    # as wordpress's jordan@ and woo's demo customer).
    echo "GHOST_DEMO_NAME='Nadia Ferro'"
    echo "GHOST_DEMO_EMAIL=nadia@ghost.demo.busymate.ai"
  } >"$DATA/.env"
  chmod 600 "$DATA/.env"
fi
set -a; . "$DATA/.env"; set +a

docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null

if ! docker inspect demo-ghost-db >/dev/null 2>&1; then
  docker run -d --name demo-ghost-db --restart unless-stopped \
    --network "$NET" \
    -e MYSQL_DATABASE="$MYSQL_DB" \
    -e MYSQL_USER="$MYSQL_USER" \
    -e MYSQL_PASSWORD="$MYSQL_PASS" \
    -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASS" \
    -v "$DATA/db:/var/lib/mysql" \
    --memory 256m \
    mysql:8 \
    --innodb-buffer-pool-size=48M --performance-schema=OFF --max-connections=30 >/dev/null
fi

if ! docker inspect demo-ghost >/dev/null 2>&1; then
  docker run -d --name demo-ghost --restart unless-stopped \
    --network "$NET" \
    -p "127.0.0.1:${PORT}:2368" \
    -e url="https://${FQDN}" \
    -e NODE_ENV=production \
    -e database__client=mysql \
    -e database__connection__host=demo-ghost-db \
    -e database__connection__user="$MYSQL_USER" \
    -e database__connection__password="$MYSQL_PASS" \
    -e database__connection__database="$MYSQL_DB" \
    -e mail__transport=Direct \
    -e security__staffDeviceVerification=false \
    -v "$DATA/content:/var/lib/ghost/content" \
    --memory 384m \
    ghost:5-alpine >/dev/null
fi

mkdir -p "$ACME/.well-known/acme-challenge"
chmod -R 755 "$ACME"
render() {
  sed -e "s#__FQDN__#${FQDN}#g" -e "s#__PORT__#${PORT}#g" -e "s#__MCP_PORT__#${MCP_PORT}#g" -e "s#__ACME_ROOT__#${ACME}#g" "$1" >"$CONF"
  ln -sf "$CONF" "/etc/nginx/sites-enabled/${FQDN}.conf"
  nginx -t && systemctl reload nginx
}
if [ ! -f "/etc/letsencrypt/live/${FQDN}/fullchain.pem" ]; then
  render "$TPL/ghost-http.conf.template"
  certbot certonly --webroot -w "$ACME" --non-interactive --agree-tos -m "$CERT_EMAIL" -d "$FQDN"
fi
render "$TPL/ghost-https.conf.template"

docker ps --filter name=demo-ghost --format '{{.Names}}  {{.Status}}  {{.Ports}}'
echo "vhost   $CONF"
curl -sS -o /dev/null -w 'https://%{url.host}/ -> %{http_code}\n' "https://$FQDN/" 2>/dev/null || true
