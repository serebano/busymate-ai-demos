<?php
/**
 * `includes/class-bmai-admin.php` — the settings/status screen (#2968).
 *
 * Menu placement mirrors the per-tenant generator's own status screen
 * (`v2/apps/web/lib/commerce/wordpress/adminPhp.ts`) so a merchant who has
 * seen either finds the other in the same place: under WooCommerce when
 * it's active, under Settings otherwise.
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Admin {

	const PAGE_SLUG = 'bmai-assistant';

	/**
	 * @return bool
	 */
	public static function has_woocommerce() {
		return class_exists( 'WooCommerce' );
	}

	/**
	 * @return string
	 */
	public static function page_url() {
		$base = self::has_woocommerce() ? 'admin.php' : 'options-general.php';
		return admin_url( $base . '?page=' . self::PAGE_SLUG );
	}

	/**
	 * @return void
	 */
	public static function register_menu() {
		$capability = bmai_required_capability();
		$title      = __( 'Busymate AI', 'bmai-assistant' );
		if ( self::has_woocommerce() ) {
			add_submenu_page( 'woocommerce', $title, $title, $capability, self::PAGE_SLUG, array( __CLASS__, 'render' ) );
			return;
		}
		add_options_page( $title, $title, $capability, self::PAGE_SLUG, array( __CLASS__, 'render' ) );
	}

	/**
	 * @param string $hook The current admin page hook, from `admin_enqueue_scripts`.
	 * @return void
	 */
	public static function enqueue_assets( $hook ) {
		if ( false === strpos( (string) $hook, self::PAGE_SLUG ) ) {
			return;
		}
		wp_enqueue_style( 'bmai-admin', BMAI_PLUGIN_URL . 'admin/assets/admin.css', array(), BMAI_VERSION );
		wp_enqueue_script( 'bmai-admin', BMAI_PLUGIN_URL . 'admin/assets/admin.js', array(), BMAI_VERSION, true );
	}

	/**
	 * Reads the redirect-carried notice (see `redirect_with_notice` in the
	 * OAuth and WooCommerce classes) and prints it once. GET-only, read-only —
	 * nothing here writes, so there is no CSRF surface to guard with a nonce.
	 *
	 * @return void
	 */
	public static function render_notices() {
		$screen = get_current_screen();
		if ( ! $screen || false === strpos( $screen->id, self::PAGE_SLUG ) ) {
			return;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only display of a value THIS PLUGIN put in its own redirect URL; nothing is written here.
		$code = isset( $_GET['bmai_notice'] ) ? sanitize_key( wp_unslash( $_GET['bmai_notice'] ) ) : '';
		$detail = isset( $_GET['bmai_notice_detail'] ) ? sanitize_text_field( wp_unslash( $_GET['bmai_notice_detail'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		if ( '' === $code ) {
			return;
		}
		$messages = array(
			'connected'        => array( 'success', __( 'Connected. Your workspace and embed address were filled in automatically.', 'bmai-assistant' ) ),
			'disconnected'     => array( 'info', __( 'Disconnected your Busymate AI account. The widget keeps working with the workspace address already saved.', 'bmai-assistant' ) ),
			'denied'           => array( 'warning', __( 'The connection was not approved.', 'bmai-assistant' ) ),
			'bad_callback'     => array( 'error', __( 'The connection attempt was incomplete.', 'bmai-assistant' ) ),
			'bad_state'        => array( 'error', __( 'That connection link expired or was already used.', 'bmai-assistant' ) ),
			'register_failed'  => array( 'error', __( 'Could not register this site with Busymate AI.', 'bmai-assistant' ) ),
			'token_failed'     => array( 'error', __( 'Busymate AI refused the connection.', 'bmai-assistant' ) ),
			'workspace_failed' => array( 'error', __( 'Connected, but could not read your workspace.', 'bmai-assistant' ) ),
			'woo_missing'      => array( 'error', __( 'WooCommerce is not active on this site.', 'bmai-assistant' ) ),
			'not_connected'    => array( 'error', __( 'Connect your Busymate AI account first.', 'bmai-assistant' ) ),
			'woo_disconnected' => array( 'info', __( 'Busymate AI will no longer read this store\'s products and orders.', 'bmai-assistant' ) ),
		);
		if ( ! isset( $messages[ $code ] ) ) {
			return;
		}
		list( $type, $text ) = $messages[ $code ];
		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s%3$s</p></div>',
			esc_attr( $type ),
			esc_html( $text ),
			'' !== $detail ? ' ' . esc_html( $detail ) : ''
		);
	}

	/**
	 * @return void
	 */
	public static function render() {
		if ( ! current_user_can( bmai_required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to manage Busymate AI on this site.', 'bmai-assistant' ) );
		}
		require BMAI_PLUGIN_DIR . 'admin/settings-page.php';
	}
}
