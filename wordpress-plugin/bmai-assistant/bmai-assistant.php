<?php
/**
 * Plugin Name:       Busymate AI
 * Plugin URI:        https://busymate.ai/integrations/wordpress
 * Description:       Puts your mate — a grounded AI assistant — on your WordPress site. Connect your Busymate AI workspace, drop it in with a block or shortcode, and optionally let it read your WooCommerce catalogue and orders.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Tested up to:      6.8
 * Requires PHP:      7.4
 * Author:            Busymate AI
 * Author URI:        https://busymate.ai
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       bmai-assistant
 * Domain Path:       /languages
 * Update URI:        false
 *
 * @package Bmai_Assistant
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────
 * The real, self-serve WordPress.org-shaped plugin (owner priority #1 native
 * integration, program #2662, build issue #2968) — distinct from the
 * PER-TENANT zip a Console download button already generates
 * (v2/apps/web/lib/commerce/wordpressPlugin.ts, #2842): that one bakes ONE
 * tenant's id into the PHP at build time and ships no settings screen at
 * all, because the Console already knows the caller. THIS plugin is
 * downloaded once, generically, from wp.org (or a zip upload) and every
 * site configures itself — by OAuth "Connect your account" or by typing a
 * workspace slug — which is exactly the settings screen the other build
 * deliberately has no use for. The two do not duplicate each other; they
 * are the self-serve and the Console-issued halves of the same job.
 *
 * ── REMOTE-UPDATABLE FIRST (HARD, notes/RULES.md) ────────────────────────
 * This plugin bakes in NOTHING a product decision could change: no copy the
 * visitor reads, no colour, no launcher position (the launcher owns
 * bottom-right, unconditionally — #2460), no feature flag, no tool list.
 * All of that rides `embed/v1.js`, served fresh on every page load from the
 * connected workspace's own origin. Shipping a new widget never requires a
 * merchant to update this plugin.
 *
 * ── NO FUNCTIONALITY GATE (wp.org guideline, HARD) ───────────────────────
 * Nothing in this plugin checks a plan, a licence key, a quota or a trial
 * countdown. Every feature below works for every install. Billing, if any,
 * lives entirely in the connected busymate.ai workspace — never here.
 */

defined( 'ABSPATH' ) || exit;

/*
 * ── The whole of this plugin's baked-in configuration ────────────────────
 * Everything else is a per-site OPTION (Settings API, below), never a
 * constant — that is the entire difference from the per-tenant generator.
 */
define( 'BMAI_VERSION', '1.0.0' );
define( 'BMAI_PLUGIN_FILE', __FILE__ );
define( 'BMAI_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BMAI_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'BMAI_PRODUCT_NAME', 'Busymate AI' );
define( 'BMAI_TEXT_DOMAIN', 'bmai-assistant' );
define( 'BMAI_SCRIPT_HANDLE', 'bmai-assistant-embed' );
define( 'BMAI_OPTION_GROUP', 'bmai_assistant' );
/** The default platform host. Every setting below can override it — a
 * connected workspace's OWN origin (`<slug>.busymate.ai`) is what actually
 * ships once "Connect your account" or manual setup has run.
 */
define( 'BMAI_DEFAULT_ORIGIN', 'https://busymate.ai' );
/** The public OAuth 2.1 authorization server this plugin's Connect flow
 * talks to. Standards-only: RFC 7591 dynamic client registration, RFC 7636
 * PKCE (S256), authorization code grant — the SAME server real MCP clients
 * (Claude, etc.) already register against. See includes/class-oauth-connect.php.
 */
define( 'BMAI_OAUTH_ISSUER', 'https://busymate.ai/mcp' );

require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-settings.php';
require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-enqueue.php';
require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-block.php';
require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-shortcode.php';
require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-oauth-connect.php';
require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-woocommerce.php';
require_once BMAI_PLUGIN_DIR . 'includes/class-bmai-admin.php';

/**
 * The capability every screen and write in this plugin answers to.
 *
 * WooCommerce grants 'manage_woocommerce' to shop managers as well as
 * administrators, which is who should be allowed to connect a support
 * assistant to a store. Fall back to 'manage_options' ONLY when WooCommerce
 * itself is not active, so a plain WordPress site still has a reachable
 * screen for its administrator.
 *
 * @return string
 */
function bmai_required_capability() {
	return class_exists( 'WooCommerce' ) ? 'manage_woocommerce' : 'manage_options';
}

/**
 * @return void
 */
function bmai_load_textdomain() {
	load_plugin_textdomain( BMAI_TEXT_DOMAIN, false, dirname( plugin_basename( BMAI_PLUGIN_FILE ) ) . '/languages' );
}
add_action( 'init', 'bmai_load_textdomain' );

/**
 * Default options set on activation — never destructive, `add_option` only
 * ever creates, so re-activating after a manual settings edit never clobbers
 * it.
 *
 * @return void
 */
function bmai_activate() {
	add_option( 'bmai_workspace_slug', '' );
	add_option( 'bmai_embed_origin', '' );
	add_option( 'bmai_label', __( 'Ask us', 'bmai-assistant' ) );
	add_option( 'bmai_aria_label', '' );
	add_option( 'bmai_site_wide', true );
	add_option( 'bmai_woo_enabled', false );
	// autoload=no: OAuth material is read on exactly two occasions (the
	// Woo handshake, the settings screen's own status line), never on every
	// front-end page load — it has no business riding the alloptions cache.
	add_option( 'bmai_oauth_refresh_token', '', '', false );
	add_option( 'bmai_oauth_client_id', '', '', false );
	Bmai_Block::register_type();
	flush_rewrite_rules( false );
}
register_activation_hook( __FILE__, 'bmai_activate' );

/**
 * @return void
 */
function bmai_deactivate() {
	flush_rewrite_rules( false );
}
register_deactivation_hook( __FILE__, 'bmai_deactivate' );

add_action( 'init', array( 'Bmai_Block', 'register_type' ) );
add_action( 'init', array( 'Bmai_Shortcode', 'register' ) );
add_action( 'wp_enqueue_scripts', array( 'Bmai_Enqueue', 'maybe_enqueue_site_wide' ) );
add_filter( 'script_loader_tag', array( 'Bmai_Enqueue', 'script_loader_tag' ), 10, 3 );
add_action( 'admin_menu', array( 'Bmai_Admin', 'register_menu' ) );
add_action( 'admin_init', array( 'Bmai_Settings', 'register' ) );
add_action( 'admin_post_bmai_oauth_start', array( 'Bmai_Oauth_Connect', 'handle_start' ) );
add_action( 'admin_post_bmai_oauth_callback', array( 'Bmai_Oauth_Connect', 'handle_callback' ) );
add_action( 'admin_post_bmai_oauth_disconnect', array( 'Bmai_Oauth_Connect', 'handle_disconnect' ) );
add_action( 'admin_post_bmai_woo_connect', array( 'Bmai_Woocommerce', 'handle_connect' ) );
add_action( 'admin_post_bmai_woo_authorize_callback', array( 'Bmai_Woocommerce', 'handle_authorize_callback' ) );
// WooCommerce's own authorize screen drives the callback POST from the
// merchant's browser via JS `fetch()`; it is normally same-origin and
// therefore authenticated, but the request carries its OWN single-use proof
// (the `user_id` slot, checked against a server-side transient in the
// handler) rather than relying on that session — so the logged-out variant
// is wired too, and is exactly as safe.
add_action( 'admin_post_nopriv_bmai_woo_authorize_callback', array( 'Bmai_Woocommerce', 'handle_authorize_callback' ) );
add_action( 'admin_post_bmai_woo_disconnect', array( 'Bmai_Woocommerce', 'handle_disconnect' ) );
add_action( 'admin_enqueue_scripts', array( 'Bmai_Admin', 'enqueue_assets' ) );
add_action( 'admin_notices', array( 'Bmai_Admin', 'render_notices' ) );

/**
 * A "Settings" link on the plugins list — the one place a merchant looks
 * first when something needs configuring.
 *
 * @param array $links Existing action links.
 * @return array
 */
function bmai_plugin_action_links( $links ) {
	array_unshift(
		$links,
		sprintf(
			'<a href="%1$s">%2$s</a>',
			esc_url( Bmai_Admin::page_url() ),
			esc_html__( 'Settings', 'bmai-assistant' )
		)
	);
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'bmai_plugin_action_links' );
