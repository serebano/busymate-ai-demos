#!/usr/bin/env bash
# Seed the Fernweh Supply Co. demo store into the running WordPress container.
# IDEMPOTENT: re-running updates in place and never duplicates a product, page,
# category, zone, customer, order or API key.
#
#   ROOT=/srv/demos/woo bash seed.sh
#
# Runs on the demos droplet as root. Everything is driven through wp-cli inside
# the `demo-woo` container (`docker exec`); the store's admin surface is closed
# to the public, so this script is the only way the shop is ever administered.
#
# Reads: catalog.json, pages.json, images.json (+ ./img from fetch-images.sh)
# Secrets: taken from $ROOT/data/.env, generated on the box, never in argv.
# NOTE: no `pipefail` — this script pipes wp-cli through `head -1` in a dozen
# places, and SIGPIPE on the producer would abort an otherwise fine lookup.
set -eu

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ROOT:-/srv/demos/woo}"
CONTAINER="${CONTAINER:-demo-woo}"
SITE_URL="${SITE_URL:-https://woo.demo.busymate.ai}"
CAT="$HERE/catalog.json"; PAGES="$HERE/pages.json"; IMGDIR="$HERE/img"

set -a; . "$ROOT/data/.env"; set +a

wp() { docker exec -u www-data -e HOME=/tmp -e WOO_ADMIN_USER="$WOO_ADMIN_USER" \
         "$CONTAINER" wp --path=/var/www/html "$@"; }
wpq() { wp "$@" 2>/dev/null; }
j() { jq -r "$1" "$CAT"; }
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- wp-cli -----
say "wp-cli"
if ! docker exec "$CONTAINER" test -x /usr/local/bin/wp; then
  curl -sSL -o /tmp/wp-cli.phar https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
  docker cp /tmp/wp-cli.phar "$CONTAINER:/usr/local/bin/wp"
  docker exec "$CONTAINER" chmod +x /usr/local/bin/wp
fi
wp --info | head -3

# ------------------------------------------------------------ core install ---
say "WordPress core"
if ! wpq core is-installed; then
  wp core install \
    --url="$SITE_URL" \
    --title="$(j '.store.name')" \
    --admin_user="$WOO_ADMIN_USER" \
    --admin_password="$WOO_ADMIN_PASS" \
    --admin_email="$WOO_ADMIN_EMAIL" \
    --skip-email
fi
wp option update blogname "$(j '.store.name')"
wp option update blogdescription "$(j '.store.tagline')"
wp option update timezone_string "Europe/Berlin"
wp option update date_format "j F Y"
wp option update start_of_week 1
wp rewrite structure '/%postname%/' --hard
wp rewrite flush --hard

# Comments and pingbacks are off: a demo shop has no reason to accept either.
wp option update default_comment_status closed
wp option update default_ping_status closed
wp option update comment_registration 1
wp option update close_comments_for_old_posts 1
wp option update close_comments_days_old 0

# ---------------------------------------------------------------- plugins ----
say "WooCommerce + Storefront"
wp plugin is-installed woocommerce 2>/dev/null || wp plugin install woocommerce
wp plugin is-active woocommerce 2>/dev/null || wp plugin activate woocommerce
wp theme is-installed storefront 2>/dev/null || wp theme install storefront
[ "$(wpq theme list --status=active --field=name)" = storefront ] || wp theme activate storefront
wp plugin list --format=csv --fields=name,status,version

# --------------------------------------------------------------- store opts --
say "store settings"
wp option update woocommerce_store_address   "$(j '.store.address')"
wp option update woocommerce_store_city      "$(j '.store.city')"
wp option update woocommerce_store_postcode  "$(j '.store.postcode')"
wp option update woocommerce_default_country "$(j '.store.country'):SN"
wp option update woocommerce_currency        "$(j '.store.currency')"
wp option update woocommerce_currency_pos    right_space
wp option update woocommerce_weight_unit     "$(j '.store.weight_unit')"
wp option update woocommerce_dimension_unit  "$(j '.store.dimension_unit')"
wp option update woocommerce_calc_taxes      no
wp option update woocommerce_enable_reviews  no
wp option update woocommerce_manage_stock    yes
wp option update woocommerce_notify_low_stock_amount 5
wp option update woocommerce_allow_tracking  no
# Cosmetic onboarding state: WooCommerce refuses some of these when the option
# does not exist yet, and none of them are load-bearing — never fail the seed.
wp option set woocommerce_task_list_hidden yes 2>/dev/null || true
wp option set woocommerce_task_list_welcome_modal_dismissed yes 2>/dev/null || true
wp option set woocommerce_onboarding_profile \
  '{"skipped":true,"completed":true,"business_choice":"im_already_selling","industry":[{"slug":"fashion-apparel-accessories"}]}' \
  --format=plaintext 2>/dev/null || true
wp option set woocommerce_cheque_settings '{"enabled":"yes","title":"Bank transfer","description":"Demo store — no payment is really taken."}' --format=plaintext 2>/dev/null || true
wp wc tool run install_pages --user=1 >/dev/null

# --------------------------------------------------------------- categories --
say "product categories"
declare -A CATID
while IFS=$'\t' read -r slug name desc; do
  id=$(wpq wc product_cat list --slug="$slug" --field=id --user=1 | head -1 || true)
  if [ -z "${id:-}" ]; then
    id=$(wp wc product_cat create --name="$name" --slug="$slug" --description="$desc" --porcelain --user=1)
    echo "created  $slug -> $id"
  else
    wp wc product_cat update "$id" --name="$name" --description="$desc" --user=1 >/dev/null
    echo "updated  $slug -> $id"
  fi
  CATID[$slug]=$id
done < <(jq -r '.categories[] | [.slug,.name,.description] | @tsv' "$CAT")

# ------------------------------------------------------------------ images ---
say "product images"
if [ -d "$IMGDIR" ]; then
  docker exec "$CONTAINER" mkdir -p /tmp/fernweh-img
  docker cp "$IMGDIR/." "$CONTAINER:/tmp/fernweh-img/"
  docker exec "$CONTAINER" chown -R www-data:www-data /tmp/fernweh-img
fi
declare -A MEDIA
while IFS=$'\t' read -r id alt; do
  mid=$(wpq post list --post_type=attachment --name="fernweh-$id" --field=ID --posts_per_page=1 | head -1 || true)
  if [ -z "${mid:-}" ]; then
    mid=$(wp media import "/tmp/fernweh-img/$id.jpg" \
      --title="$alt" --alt="$alt" --porcelain)
    wp post update "$mid" --post_name="fernweh-$id" >/dev/null
    echo "imported $id -> $mid"
  fi
  MEDIA[$id]=$mid
done < <(jq -r '.images[] | [.id,.alt] | @tsv' "$HERE/images.json")

# ---------------------------------------------------------------- products ---
say "products"
COUNT=$(jq '.products | length' "$CAT")
for i in $(seq 0 $((COUNT-1))); do
  p() { jq -r ".products[$i].$1" "$CAT"; }
  sku=$(p sku); cat_slug=$(p category); imgid=$(p image)
  attrs=$(jq -c ".products[$i].attributes | to_entries | map({name:.key, options:[.value], visible:true, variation:false})" "$CAT")
  stock=$(p stock); sale=$(p sale_price)
  # stock_status is DERIVED by WooCommerce from manage_stock + stock_quantity
  # (the CLI rejects it as a parameter), so 0 units is what makes an item
  # "out of stock" here — see FW-PK-G38.
  args=(
    --name="$(p name)"
    --sku="$sku"
    --type=simple
    --status=publish
    --catalog_visibility=visible
    --regular_price="$(p price)"
    --description="$(p description)"
    --short_description="$(p short)"
    --manage_stock=true
    --stock_quantity="$stock"
    --backorders=no
    --weight="$(p weight)"
    --dimensions="$(jq -c ".products[$i].dimensions" "$CAT")"
    --categories="[{\"id\":${CATID[$cat_slug]}}]"
    --attributes="$attrs"
    --images="[{\"id\":${MEDIA[$imgid]}}]"
    --featured="$(p featured)"
    --reviews_allowed=false
    --user=1
  )
  [ -n "$sale" ] && [ "$sale" != null ] && args+=(--sale_price="$sale")
  pid=$(wpq wc product list --sku="$sku" --field=id --user=1 | head -1 || true)
  if [ -z "${pid:-}" ]; then
    pid=$(wp wc product create "${args[@]}" --porcelain)
    echo "created  $sku -> $pid"
  else
    wp wc product update "$pid" "${args[@]}" >/dev/null
    echo "updated  $sku -> $pid"
  fi
  echo "$sku $pid" >>/tmp/fernweh-products.txt
done

# ------------------------------------------------------------------- pages ---
say "policy pages"
jq -c '.pages[]' "$PAGES" | while read -r row; do
  slug=$(echo "$row" | jq -r .slug)
  title=$(echo "$row" | jq -r .title)
  body=$(echo "$row" | jq -r .content)
  pid=$(wpq post list --post_type=page --name="$slug" --field=ID --posts_per_page=1 | head -1 || true)
  if [ -z "${pid:-}" ]; then
    pid=$(printf '%s' "$body" | wp post create - --post_type=page --post_title="$title" \
      --post_name="$slug" --post_status=publish --porcelain)
    echo "created  /$slug -> $pid"
  else
    printf '%s' "$body" | wp post update "$pid" - --post_title="$title" --post_status=publish >/dev/null
    echo "updated  /$slug -> $pid"
  fi
done
priv=$(wpq post list --post_type=page --name=privacy --field=ID --posts_per_page=1 | head -1 || true)
[ -n "${priv:-}" ] && wp option update wp_page_for_privacy_policy "$priv"

# -------------------------------------------------------------------- menu ---
say "primary menu"
wpq menu list --fields=name | grep -qx "Main" || wp menu create "Main"
for slug in shop shipping returns terms privacy; do
  pid=$(wpq post list --post_type=page --name="$slug" --field=ID --posts_per_page=1 | head -1 || true)
  [ -n "${pid:-}" ] || continue
  wpq menu item list Main --fields=object_id | grep -qx "$pid" || wp menu item add-post Main "$pid" >/dev/null
done
wp menu location assign Main primary >/dev/null 2>&1 || true

# ---------------------------------------------------------------- shipping ---
# Driven through WC_Shipping_Zone rather than `wp wc shipping_zone*`: the CLI
# resource cannot set zone LOCATIONS (no such parameter) and 404s on the method
# sub-resource, so a CLI-built zone would ship with no countries in it — live,
# green, and matching nobody's address.
say "shipping zones"
ZONES_JSON=$(jq -c '.shipping.zones' "$CAT")
cat >/tmp/fw-zones.php <<PHP
<?php
\$zones = json_decode('$ZONES_JSON', true);
foreach (\$zones as \$i => \$z) {
  if (\$z['type'] === 'everywhere') {
    \$zone = new WC_Shipping_Zone(0);           // "rest of the world" is zone 0
  } else {
    \$id = null;
    foreach (WC_Shipping_Zones::get_zones() as \$ez) {
      if (\$ez['zone_name'] === \$z['name']) { \$id = \$ez['zone_id']; break; }
    }
    \$zone = new WC_Shipping_Zone(\$id);
    \$zone->set_zone_name(\$z['name']);
    \$zone->set_zone_order(\$i + 1);
    \$locs = array();
    foreach (array_filter(explode(',', \$z['code'])) as \$c) {
      \$locs[] = array('code' => \$c, 'type' => \$z['type']);
    }
    \$zone->set_locations(\$locs);
    \$zone->save();
  }
  \$have = array();
  foreach (\$zone->get_shipping_methods(false) as \$m) { \$have[\$m->id] = \$m->instance_id; }
  \$flat = isset(\$have['flat_rate']) ? \$have['flat_rate'] : \$zone->add_shipping_method('flat_rate');
  update_option('woocommerce_flat_rate_' . \$flat . '_settings', array(
    'title' => 'Standard delivery', 'cost' => \$z['flat_rate'], 'tax_status' => 'none',
  ));
  if (!empty(\$z['free_over'])) {
    \$fs = isset(\$have['free_shipping']) ? \$have['free_shipping'] : \$zone->add_shipping_method('free_shipping');
    update_option('woocommerce_free_shipping_' . \$fs . '_settings', array(
      'title' => 'Free delivery', 'requires' => 'min_amount',
      'min_amount' => \$z['free_over'], 'ignore_discounts' => 'no',
    ));
  }
  \$zone->save();
  printf("zone  %-34s id=%-3d flat=%s free_over=%s locations=%d\n",
    \$z['name'], \$zone->get_id(), \$z['flat_rate'],
    empty(\$z['free_over']) ? '-' : \$z['free_over'], count(\$zone->get_zone_locations()));
}
PHP
docker cp /tmp/fw-zones.php "$CONTAINER:/tmp/fw-zones.php" >/dev/null
wp eval-file /tmp/fw-zones.php

# ------------------------------------------------------------ demo customer --
say "demo customer"
CID=$(wpq user get "$WOO_CUSTOMER_EMAIL" --field=ID 2>/dev/null || true)
if [ -z "${CID:-}" ]; then
  CID=$(wp wc customer create --email="$WOO_CUSTOMER_EMAIL" --username="$WOO_CUSTOMER_USER" \
    --password="$WOO_CUSTOMER_PASS" --first_name="Mara" --last_name="Oertel" --porcelain --user=1)
else
  wp user update "$CID" --user_pass="$WOO_CUSTOMER_PASS" >/dev/null
fi
BILLING='{"first_name":"Mara","last_name":"Oertel","company":"","address_1":"Karl-Liebknecht-Strasse 62","address_2":"","city":"Leipzig","state":"SN","postcode":"04275","country":"DE","email":"'"$WOO_CUSTOMER_EMAIL"'","phone":"+49 341 5550188"}'
SHIPPING='{"first_name":"Mara","last_name":"Oertel","company":"","address_1":"Karl-Liebknecht-Strasse 62","address_2":"","city":"Leipzig","state":"SN","postcode":"04275","country":"DE"}'
wp wc customer update "$CID" --billing="$BILLING" --shipping="$SHIPPING" --user=1 >/dev/null
echo "customer $WOO_CUSTOMER_EMAIL -> $CID"

# -------------------------------------------------------------------- orders --
say "demo orders"
pid_of() { wpq wc product list --sku="$1" --field=id --user=1 | head -1; }
mk_order() { # <marker> <status> <line_items json> [extra…]
  local marker="$1" status="$2" items="$3"; shift 3
  local oid
  oid=$(wpq post list --post_type=shop_order --post_status=any --meta_key=_fernweh_demo \
        --meta_value="$marker" --field=ID --posts_per_page=1 2>/dev/null | head -1 || true)
  if [ -z "${oid:-}" ]; then
    # HPOS may hold orders outside wp_posts — fall back to a REST scan by marker.
    oid=$(wpq wc shop_order list --user=1 --fields=id,meta_data --format=json 2>/dev/null \
          | jq -r --arg m "$marker" '.[] | select((.meta_data//[])[]? | select(.key=="_fernweh_demo" and .value==$m)) | .id' | head -1 || true)
  fi
  if [ -z "${oid:-}" ]; then
    oid=$(wp wc shop_order create --customer_id="$CID" --status="$status" \
      --billing="$BILLING" --shipping="$SHIPPING" \
      --payment_method=cheque --payment_method_title="Bank transfer" \
      --currency="$(j '.store.currency')" \
      --line_items="$items" \
      --meta_data="[{\"key\":\"_fernweh_demo\",\"value\":\"$marker\"}]" \
      "$@" --porcelain --user=1)
    echo "created  $marker ($status) -> #$oid"
  else
    echo "exists   $marker ($status) -> #$oid"
  fi
  echo "$marker $status $oid" >>/tmp/fernweh-orders.txt
}
: >/tmp/fernweh-orders.txt
mk_order fw-processing processing \
  "[{\"product_id\":$(pid_of FW-PK-W28),\"quantity\":1},{\"product_id\":$(pid_of FW-ML-SK),\"quantity\":3}]" \
  --shipping_lines='[{"method_id":"free_shipping","method_title":"Free delivery","total":"0.00"}]'
mk_order fw-completed completed \
  "[{\"product_id\":$(pid_of FW-BT-Q750),\"quantity\":2},{\"product_id\":$(pid_of FW-NB-P03),\"quantity\":1}]" \
  --shipping_lines='[{"method_id":"flat_rate","method_title":"Standard delivery","total":"4.90"}]'
mk_order fw-refunded refunded \
  "[{\"product_id\":$(pid_of FW-ML-C250),\"quantity\":1}]" \
  --shipping_lines='[{"method_id":"flat_rate","method_title":"Standard delivery","total":"4.90"}]'
mk_order fw-cancelled cancelled \
  "[{\"product_id\":$(pid_of FW-PK-G38),\"quantity\":1}]" \
  --shipping_lines='[{"method_id":"flat_rate","method_title":"Standard delivery","total":"4.90"}]'
mk_order fw-onhold on-hold \
  "[{\"product_id\":$(pid_of FW-NB-PS1),\"quantity\":1},{\"product_id\":$(pid_of FW-BT-F500),\"quantity\":1}]" \
  --shipping_lines='[{"method_id":"free_shipping","method_title":"Free delivery","total":"0.00"}]'

# Paid orders must LOOK paid (a date_paid the REST API returns), and a refunded
# order with no refund row is a status with nothing behind it — the API would
# report `refunded` while /orders/<id>/refunds came back empty.
REFUNDED_ID=$(awk '$1=="fw-refunded"{print $3}' /tmp/fernweh-orders.txt)
PAID_IDS=$(awk '$1=="fw-processing"||$1=="fw-completed"{print $3}' /tmp/fernweh-orders.txt | tr '\n' ',')
cat >/tmp/fw-orders.php <<PHP
<?php
foreach (array_filter(explode(',', '$PAID_IDS')) as \$oid) {
  \$o = wc_get_order((int) \$oid);
  if (\$o && !\$o->get_date_paid()) { \$o->payment_complete('demo-' . \$oid); \$o->save(); }
}
\$r = wc_get_order((int) '$REFUNDED_ID');
if (\$r && count(\$r->get_refunds()) === 0) {
  \$items = array();
  foreach (\$r->get_items() as \$iid => \$item) {
    \$items[\$iid] = array('qty' => \$item->get_quantity(), 'refund_total' => \$item->get_total());
  }
  wc_create_refund(array(
    'order_id'   => \$r->get_id(),
    'amount'     => \$r->get_total(),
    'reason'     => 'Returned within 60 days — sizing.',
    'line_items' => \$items,
    'refund_payment' => false,
  ));
}
foreach (wc_get_orders(array('limit' => -1)) as \$o) {
  printf("order #%d  %-11s %s %s\n", \$o->get_id(), \$o->get_status(),
    \$o->get_total(), \$o->get_currency());
}
PHP
docker cp /tmp/fw-orders.php "$CONTAINER:/tmp/fw-orders.php" >/dev/null
wp eval-file /tmp/fw-orders.php

# ----------------------------------------------------------------- REST key --
say "WooCommerce REST key"
if [ -s "$ROOT/data/.wc-api-key" ]; then
  echo "already issued (see \$ROOT/data/.wc-api-key)"
else
  umask 077
  wp eval '
    global $wpdb;
    $user = get_user_by("login", getenv("WOO_ADMIN_USER"));
    $ck = "ck_" . wc_rand_hash();
    $cs = "cs_" . wc_rand_hash();
    $wpdb->insert($wpdb->prefix . "woocommerce_api_keys", array(
      "user_id"         => $user->ID,
      "description"     => "Busymate demo connector (read_write)",
      "permissions"     => "read_write",
      "consumer_key"    => wc_api_hash($ck),
      "consumer_secret" => $cs,
      "truncated_key"   => substr($ck, -7),
    ), array("%d","%s","%s","%s","%s","%s"));
    echo "WC_CONSUMER_KEY=" . $ck . "\nWC_CONSUMER_SECRET=" . $cs . "\n";
  ' > "$ROOT/data/.wc-api-key"
  chmod 600 "$ROOT/data/.wc-api-key"
  echo "issued -> $ROOT/data/.wc-api-key"
fi

# -------------------------------------------------------------------- tidy ---
say "tidy"
# The shop, not a blog, is the front page.
SHOP=$(wpq post list --post_type=page --name=shop --field=ID --posts_per_page=1 | head -1 || true)
if [ -n "${SHOP:-}" ]; then
  wp option update show_on_front page
  wp option update page_on_front "$SHOP"
fi
# WordPress's own starter content has no place in a store demo.
for slug in sample-page refund_returns hello-world; do
  id=$(wpq post list --post_type=any --post_status=any --name="$slug" --field=ID --posts_per_page=1 | head -1 || true)
  [ -n "${id:-}" ] && wp post delete "$id" --force >/dev/null && echo "deleted  $slug"
done
wp plugin is-active akismet 2>/dev/null && wp plugin deactivate akismet >/dev/null || true
wp post list --post_type=post --format=ids | tr ' ' '\n' | while read -r id; do
  [ -n "$id" ] && wp post update "$id" --comment_status=closed --ping_status=closed >/dev/null
done

say "done"
wp wc product list --user=1 --fields=id,sku,name,price --format=table --per_page=20
