#!/usr/bin/env bash
# Stand the WordPress CONTENT demo up on the demo host (distinct from woo,
# which is commerce). IDEMPOTENT — safe to re-run.
set -euo pipefail

NAME=wordpress
PORT=8114
MCP_PORT=8115
FQDN=wordpress.demo.busymate.ai
ROOT=<demo-host>/$NAME
DATA=$ROOT/data
ACME=$ROOT/acme
NET=demo-wordpress-net
REPO_DIR="${REPO_DIR:-<demo-host>/_repo}"
TPL="$REPO_DIR/infra/nginx"
CERT_EMAIL="${CERT_EMAIL:-admin@busymate.ai}"
CONF=/etc/nginx/sites-available/$FQDN.conf

mkdir -p "$DATA/db" "$DATA/wp" "$ACME"
chmod 755 "$ROOT" "$ACME"
if [ ! -f "$DATA/.env" ]; then
  umask 077
  {
    echo "WP_DB_NAME=wordpress"
    echo "WP_DB_USER=wordpress"
    echo "WP_DB_PASS=$(openssl rand -hex 24)"
    echo "WP_DB_ROOT_PASS=$(openssl rand -hex 24)"
    echo "WP_ADMIN_USER=larkspur_ops"
    echo "WP_ADMIN_PASS=$(openssl rand -base64 21 | tr -d '/+=')Aa1!"
    echo "WP_ADMIN_EMAIL=ops@wordpress.demo.busymate.ai"
    # Demo customer — a PROVIDED, stable throwaway account (same convention as woo).
    echo "WP_DEMO_EMAIL=jordan@wordpress.demo.busymate.ai"
    echo "WP_DEMO_USER=jordan"
    echo "WP_DEMO_PASS=LarkspurDemo2026!"
  } >"$DATA/.env"
  chmod 600 "$DATA/.env"
fi
set -a; . "$DATA/.env"; set +a

docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null

if ! docker inspect demo-wordpress-db >/dev/null 2>&1; then
  docker run -d --name demo-wordpress-db --restart unless-stopped \
    --network "$NET" \
    -e MARIADB_DATABASE="$WP_DB_NAME" \
    -e MARIADB_USER="$WP_DB_USER" \
    -e MARIADB_PASSWORD="$WP_DB_PASS" \
    -e MARIADB_ROOT_PASSWORD="$WP_DB_ROOT_PASS" \
    -v "$DATA/db:/var/lib/mysql" \
    --memory 256m \
    mariadb:11 \
    --innodb-buffer-pool-size=32M --performance-schema=OFF \
    --max-connections=30 --key-buffer-size=8M >/dev/null
fi

read -r -d '' WP_EXTRA <<'PHP' || true
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' ) {
    $_SERVER['HTTPS'] = 'on';
}
if ( isset( $_SERVER['HTTP_X_FORWARDED_HOST'] ) ) {
    $_SERVER['HTTP_HOST'] = $_SERVER['HTTP_X_FORWARDED_HOST'];
}
define( 'WP_HOME',    'https://wordpress.demo.busymate.ai' );
define( 'WP_SITEURL', 'https://wordpress.demo.busymate.ai' );
define( 'FORCE_SSL_ADMIN', true );
define( 'DISALLOW_FILE_EDIT', true );
define( 'AUTOMATIC_UPDATER_DISABLED', true );
define( 'WP_MEMORY_LIMIT', '192M' );
PHP

if ! docker inspect demo-wordpress >/dev/null 2>&1; then
  docker run -d --name demo-wordpress --restart unless-stopped \
    --network "$NET" \
    -p "127.0.0.1:${PORT}:80" \
    -e WORDPRESS_DB_HOST=demo-wordpress-db:3306 \
    -e WORDPRESS_DB_NAME="$WP_DB_NAME" \
    -e WORDPRESS_DB_USER="$WP_DB_USER" \
    -e WORDPRESS_DB_PASSWORD="$WP_DB_PASS" \
    -e WORDPRESS_TABLE_PREFIX=wp_ \
    -e WORDPRESS_CONFIG_EXTRA="$WP_EXTRA" \
    -v "$DATA/wp:/var/www/html" \
    --memory 448m \
    wordpress:php8.3-apache >/dev/null
fi

mkdir -p "$ACME/.well-known/acme-challenge"
chmod -R 755 "$ACME"
render() {
  sed -e "s#__FQDN__#${FQDN}#g" -e "s#__PORT__#${PORT}#g" -e "s#__MCP_PORT__#${MCP_PORT}#g" -e "s#__ACME_ROOT__#${ACME}#g" "$1" >"$CONF"
  ln -sf "$CONF" "/etc/nginx/sites-enabled/${FQDN}.conf"
  nginx -t && systemctl reload nginx
}
if [ ! -f "/etc/letsencrypt/live/${FQDN}/fullchain.pem" ]; then
  render "$TPL/wordpress-http.conf.template"
  certbot certonly --webroot -w "$ACME" --non-interactive --agree-tos -m "$CERT_EMAIL" -d "$FQDN"
fi
render "$TPL/wordpress-https.conf.template"

docker ps --filter name=demo-wordpress --format '{{.Names}}  {{.Status}}  {{.Ports}}'
echo "vhost   $CONF"
curl -sS -o /dev/null -w 'https://%{url.host}/healthz -> %{http_code}\n' "https://$FQDN/healthz" 2>/dev/null || true
