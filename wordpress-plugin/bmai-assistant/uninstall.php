<?php
/**
 * Uninstall — runs ONLY when a merchant clicks "Delete" in wp-admin (never on
 * a plain deactivate). Removes every option this plugin ever wrote; a
 * store's WooCommerce REST API key, if the merchant connected one, is left
 * exactly as it is — this plugin never created a WooCommerce credential it
 * doesn't ALSO own the removal of would be a worse failure mode than an
 * orphaned key the merchant can still see and revoke from WooCommerce >
 * Settings > Advanced > REST API at any time.
 *
 * @package Bmai_Assistant
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$bmai_options = array(
	'bmai_workspace_slug',
	'bmai_embed_origin',
	'bmai_label',
	'bmai_aria_label',
	'bmai_site_wide',
	'bmai_woo_enabled',
	'bmai_oauth_refresh_token',
	'bmai_oauth_client_id',
);
foreach ( $bmai_options as $bmai_option ) {
	delete_option( $bmai_option );
}
