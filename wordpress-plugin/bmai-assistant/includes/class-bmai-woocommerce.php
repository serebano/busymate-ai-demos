<?php
/**
 * `includes/class-bmai-woocommerce.php` — the optional commerce switch
 * (#2968). "One plugin, two switches, not two products": this class turns
 * on the SAME order/catalogue knowledge reader a Console user turns on by
 * hand (`connect_commerce`, `_shared/commerce/woocommerceApi.ts`); it does
 * not introduce a second commerce connector.
 *
 * ── WHY `wc-auth/v1/authorize` AND NOT A HAND-TYPED KEY ─────────────────
 * WooCommerce ships its OWN standard "REST API for apps" authorization
 * endpoint precisely for this job — a plugin that needs a scoped API key
 * without asking the merchant to visit WooCommerce > Settings > Advanced >
 * REST API and paste two long strings by hand. It is WooCommerce's
 * mechanism, not one this plugin invents: the merchant is redirected to
 * their OWN store's authorize screen, approves a named, `read`-scoped app,
 * and WooCommerce POSTs the generated consumer key/secret straight to the
 * callback below. See https://developer.woocommerce.com/docs/apis/rest-api-authentication/ .
 *
 * ── SCOPE ─────────────────────────────────────────────────────────────────
 * `read` only — this connector answers questions about products and
 * orders, it never writes to the store (see the sibling TS module's own
 * documented refusal to expose a return/refund tool).
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Woocommerce {

	/**
	 * @return string This site's callback WooCommerce POSTs the generated
	 *                 key to once the merchant approves.
	 */
	public static function callback_url() {
		return admin_url( 'admin-post.php?action=bmai_woo_authorize_callback' );
	}

	/**
	 * @return bool Is a store connector already live?
	 */
	public static function is_connected() {
		return (bool) get_option( 'bmai_woo_enabled', false );
	}

	/**
	 * admin-post handler: `?action=bmai_woo_connect`. Sends the merchant's
	 * browser to THIS STORE's own WooCommerce authorize screen — never to
	 * busymate.ai — with a return trip to the callback above.
	 *
	 * @return void
	 */
	public static function handle_connect() {
		if ( ! current_user_can( bmai_required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to connect WooCommerce.', 'bmai-assistant' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bmai_woo_connect' );

		if ( ! class_exists( 'WooCommerce' ) ) {
			self::redirect_with_notice( 'woo_missing', __( 'WooCommerce is not active on this site.', 'bmai-assistant' ) );
		}
		if ( '' === get_option( 'bmai_workspace_slug', '' ) ) {
			self::redirect_with_notice( 'not_connected', __( 'Connect your Busymate AI account first.', 'bmai-assistant' ) );
		}

		// A fresh nonce every attempt, echoed back to us in the callback's
		// `user_id` slot per the wc-auth contract, and checked there —
		// WooCommerce's endpoint has no `state` parameter of its own, so this
		// value plays that role.
		$request_id = wp_generate_password( 24, false, false );
		set_transient( 'bmai_woo_request_' . $request_id, get_current_user_id(), 10 * MINUTE_IN_SECONDS );

		$authorize_url = add_query_arg(
			array(
				'app_name'     => rawurlencode( sprintf( '%s (%s)', BMAI_PRODUCT_NAME, wp_parse_url( home_url(), PHP_URL_HOST ) ) ),
				'scope'        => 'read',
				'user_id'      => rawurlencode( $request_id ),
				'return_url'   => rawurlencode( Bmai_Admin::page_url() ),
				'callback_url' => rawurlencode( self::callback_url() ),
			),
			trailingslashit( home_url() ) . 'wc-auth/v1/authorize'
		);
		wp_redirect( esc_url_raw( $authorize_url ) );
		exit;
	}

	/**
	 * The endpoint WooCommerce's OWN authorize screen POSTs to once the
	 * merchant approves — a JSON body of
	 * `{key_id, user_id, consumer_key, consumer_secret, key_permissions}`,
	 * per WooCommerce's documented contract. Never a GET, never carrying a
	 * WordPress nonce (WooCommerce's server generates this request, not this
	 * site's own admin screens) — `user_id` (our own `$request_id`) is the
	 * single-use token that stands in for one.
	 *
	 * @return void
	 */
	public static function handle_authorize_callback() {
		$raw  = file_get_contents( 'php://input' );
		$body = json_decode( (string) $raw, true );
		$request_id = is_array( $body ) && isset( $body['user_id'] ) ? sanitize_text_field( $body['user_id'] ) : '';
		$owner_id   = '' !== $request_id ? get_transient( 'bmai_woo_request_' . $request_id ) : false;
		if ( '' === $request_id || false === $owner_id ) {
			status_header( 400 );
			exit;
		}
		delete_transient( 'bmai_woo_request_' . $request_id ); // Single-use.

		$consumer_key    = isset( $body['consumer_key'] ) ? sanitize_text_field( $body['consumer_key'] ) : '';
		$consumer_secret = isset( $body['consumer_secret'] ) ? sanitize_text_field( $body['consumer_secret'] ) : '';
		if ( '' === $consumer_key || '' === $consumer_secret ) {
			status_header( 400 );
			exit;
		}

		$access_token = Bmai_Oauth_Connect::get_fresh_access_token();
		if ( is_wp_error( $access_token ) ) {
			self::store_pending_failure( (int) $owner_id, $access_token->get_error_message() );
			status_header( 200 ); // Per the wc-auth contract this endpoint answers WooCommerce, not the merchant's browser.
			exit;
		}

		$response = wp_remote_post(
			trailingslashit( untrailingslashit( BMAI_DEFAULT_ORIGIN ) ) . 'api/plugins/wordpress/commerce',
			array(
				'timeout' => 20,
				'headers' => array(
					'content-type' => 'application/json',
					'authorization' => 'Bearer ' . $access_token,
				),
				'body'    => wp_json_encode(
					array(
						'storeUrl'       => home_url( '/' ),
						'consumerKey'    => $consumer_key,
						'consumerSecret' => $consumer_secret,
					)
				),
			)
		);
		$result_body = is_wp_error( $response ) ? array() : json_decode( wp_remote_retrieve_body( $response ), true );
		$ok          = ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) && ! empty( $result_body['ok'] );
		if ( $ok ) {
			update_option( 'bmai_woo_enabled', true );
			self::store_pending_failure( (int) $owner_id, '' );
		} else {
			$message = is_wp_error( $response )
				? $response->get_error_message()
				: ( isset( $result_body['message'] ) ? $result_body['message'] : __( 'Busymate AI could not verify this store.', 'bmai-assistant' ) );
			self::store_pending_failure( (int) $owner_id, $message );
		}
		status_header( 200 );
		exit;
	}

	/**
	 * The merchant's browser round-trips back to the plugin screen (per
	 * `return_url` above) BEFORE WooCommerce's server-to-server POST above is
	 * guaranteed to have landed. A short-lived, per-admin transient is the
	 * honest way to hand the eventual result to whichever page load actually
	 * displays it — never a raw success assumption baked into the redirect.
	 *
	 * @param int    $user_id WordPress user id who started the connect.
	 * @param string $error   Empty string on success.
	 * @return void
	 */
	private static function store_pending_failure( $user_id, $error ) {
		set_transient( 'bmai_woo_result_' . $user_id, '' === $error ? 'ok' : $error, 2 * MINUTE_IN_SECONDS );
	}

	/**
	 * Reads (and clears) this admin's pending WooCommerce-connect result, if
	 * any — polled once by the settings screen on load.
	 *
	 * @return string|null 'ok', an error message, or null if nothing pending.
	 */
	public static function consume_pending_result() {
		$key    = 'bmai_woo_result_' . get_current_user_id();
		$result = get_transient( $key );
		if ( false === $result ) {
			return null;
		}
		delete_transient( $key );
		return $result;
	}

	/**
	 * admin-post handler: `?action=bmai_woo_disconnect` — turns the reader
	 * off on our side. It does not revoke the WooCommerce key on the store;
	 * WooCommerce > Settings > Advanced > REST API remains the place to
	 * revoke a key outright, exactly as it is for any other app.
	 *
	 * @return void
	 */
	public static function handle_disconnect() {
		if ( ! current_user_can( bmai_required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to disconnect WooCommerce.', 'bmai-assistant' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bmai_woo_disconnect' );
		delete_option( 'bmai_woo_enabled' );
		self::redirect_with_notice( 'woo_disconnected', '' );
	}

	/**
	 * @param string $code    Notice code.
	 * @param string $message Optional detail.
	 * @return void Always exits.
	 */
	private static function redirect_with_notice( $code, $message ) {
		$args = array( 'bmai_notice' => $code );
		if ( '' !== $message ) {
			$args['bmai_notice_detail'] = rawurlencode( wp_strip_all_tags( $message ) );
		}
		wp_safe_redirect( add_query_arg( $args, Bmai_Admin::page_url() ) );
		exit;
	}
}
