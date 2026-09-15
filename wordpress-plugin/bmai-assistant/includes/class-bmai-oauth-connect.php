<?php
/**
 * `includes/class-bmai-oauth-connect.php` — "Connect your account" (#2968).
 *
 * A STANDARDS-ONLY OAuth 2.1 client: RFC 7591 dynamic client registration,
 * RFC 7636 PKCE with S256 (mandatory — this plugin never requests the
 * "plain" method and never falls back to a client secret), authorization
 * code grant. It registers against and authorizes with the SAME
 * authorization server real MCP clients (Claude, etc.) already use
 * (`supabase/functions/mcp/index.ts`, discovery at
 * `BMAI_OAUTH_ISSUER . '/.well-known/oauth-authorization-server'`) — this
 * plugin invents no bespoke token scheme of its own.
 *
 * ── WHAT THE TOKEN IS FOR, AND WHY IT IS NOT KEPT ───────────────────────
 * The access token identifies the signed-in busymate.ai user for exactly
 * one call — `GET /api/plugins/wordpress/workspace` — which answers two
 * PUBLIC facts (workspace slug, embed origin) already visible in this
 * site's own page source the moment the widget is live. Once that call
 * returns, the access token is discarded; only the REFRESH token is kept
 * (autoload=no), and only so the WooCommerce toggle (class-bmai-woocommerce.php)
 * can mint a fresh short-lived access token later without asking the
 * merchant to reconnect. A site that never turns WooCommerce sync on could
 * safely have this class forget the refresh token too — it is kept for that
 * one downstream feature, not because the base widget needs it.
 *
 * ── CSRF / STATE ─────────────────────────────────────────────────────────
 * `state` is opaque, single-use, stored server-side in a short-lived
 * transient keyed to itself (never in a cookie a redirect could carry
 * cross-site), and is deleted the instant it is read — a replayed callback
 * fails closed.
 *
 * Authored with NO backslashes in string literals that could be mistaken
 * for escapes; this file is authored directly (it is NOT run through the
 * TypeScript template renderer the per-tenant generator uses).
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Oauth_Connect {

	const STATE_TTL = 600; // 10 minutes — long enough for a consent screen, short enough to bound replay risk.
	const SCOPE      = 'mcp';

	/**
	 * @return string This site's fixed OAuth redirect_uri. Registered with
	 *                 the authorization server at DCR time and echoed back
	 *                 unchanged at /authorize and /token, per spec.
	 */
	public static function redirect_uri() {
		return admin_url( 'admin-post.php?action=bmai_oauth_callback' );
	}

	/**
	 * RFC 7591 dynamic client registration — idempotent per site: once a
	 * client_id exists it is reused for every future connect/reconnect,
	 * never re-registered.
	 *
	 * @return string|WP_Error The client_id, or a WP_Error on failure.
	 */
	private static function ensure_client_id() {
		$existing = get_option( 'bmai_oauth_client_id', '' );
		if ( '' !== $existing ) {
			return $existing;
		}
		$response = wp_remote_post(
			BMAI_OAUTH_ISSUER . '/register',
			array(
				'timeout' => 15,
				'headers' => array( 'content-type' => 'application/json' ),
				'body'    => wp_json_encode(
					array(
						'client_name'              => sprintf( '%s (%s)', BMAI_PRODUCT_NAME, wp_parse_url( home_url(), PHP_URL_HOST ) ),
						'client_uri'               => home_url( '/' ),
						'redirect_uris'            => array( self::redirect_uri() ),
						'grant_types'              => array( 'authorization_code', 'refresh_token' ),
						'response_types'           => array( 'code' ),
						'token_endpoint_auth_method' => 'none', // Public client — PKCE carries the proof, never a secret.
						'application_type'         => 'web',
					)
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 201 !== $code && 200 !== $code || empty( $body['client_id'] ) ) {
			return new WP_Error( 'bmai_register_failed', __( 'Busymate AI could not register this site as an OAuth client.', 'bmai-assistant' ) );
		}
		update_option( 'bmai_oauth_client_id', sanitize_text_field( $body['client_id'] ), false );
		return $body['client_id'];
	}

	/**
	 * A URL-safe random string — the same shape `embed/v1.js`'s own nonce
	 * generator produces, for one obvious reason: both are "32 random bytes,
	 * base64url, no padding," and there is exactly one honest way to write
	 * that.
	 *
	 * @param int $bytes Byte length before encoding.
	 * @return string
	 */
	private static function random_urlsafe( $bytes = 32 ) {
		$raw = wp_generate_password( $bytes, false, false );
		if ( function_exists( 'random_bytes' ) ) {
			try {
				$raw = random_bytes( $bytes );
			} catch ( Exception $e ) {
				// Falls back to the wp_generate_password value above.
			}
		}
		return rtrim( strtr( base64_encode( $raw ), '+/', '-_' ), '=' );
	}

	/**
	 * @param string $verifier The PKCE code_verifier.
	 * @return string The S256 code_challenge.
	 */
	private static function code_challenge( $verifier ) {
		return rtrim( strtr( base64_encode( hash( 'sha256', $verifier, true ) ), '+/', '-_' ), '=' );
	}

	/**
	 * admin-post handler: `?action=bmai_oauth_start`. Registers (or reuses)
	 * this site's OAuth client, mints a fresh PKCE pair, and redirects the
	 * merchant's browser to the authorization server's consent screen.
	 *
	 * @return void
	 */
	public static function handle_start() {
		if ( ! current_user_can( bmai_required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to connect Busymate AI.', 'bmai-assistant' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bmai_oauth_start' );

		$client_id = self::ensure_client_id();
		if ( is_wp_error( $client_id ) ) {
			self::redirect_with_notice( 'register_failed', $client_id->get_error_message() );
		}

		$verifier  = self::random_urlsafe( 32 );
		$state     = self::random_urlsafe( 24 );
		set_transient( 'bmai_oauth_' . $state, $verifier, self::STATE_TTL );

		$authorize_url = add_query_arg(
			array(
				'client_id'             => rawurlencode( $client_id ),
				'redirect_uri'          => rawurlencode( self::redirect_uri() ),
				'response_type'         => 'code',
				'code_challenge'        => rawurlencode( self::code_challenge( $verifier ) ),
				'code_challenge_method' => 'S256',
				'state'                 => rawurlencode( $state ),
				'scope'                 => rawurlencode( self::SCOPE ),
			),
			BMAI_OAUTH_ISSUER . '/authorize'
		);
		wp_redirect( esc_url_raw( $authorize_url ) );
		exit;
	}

	/**
	 * admin-post handler: `?action=bmai_oauth_callback`. Exchanges the
	 * authorization code for a token pair, resolves the connected workspace,
	 * stores the two PUBLIC facts (slug, origin) as ordinary settings, and
	 * keeps only the refresh token (for the optional WooCommerce handshake).
	 *
	 * @return void
	 */
	public static function handle_callback() {
		if ( ! current_user_can( bmai_required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to connect Busymate AI.', 'bmai-assistant' ), '', array( 'response' => 403 ) );
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- `state` IS this flow's CSRF token (OAuth spec), verified below against the server-side transient it was minted into; there is no WP nonce to check on a cross-site redirect from the authorization server.
		$state = isset( $_GET['state'] ) ? sanitize_text_field( wp_unslash( $_GET['state'] ) ) : '';
		$code  = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( $_GET['code'] ) ) : '';
		$error = isset( $_GET['error'] ) ? sanitize_text_field( wp_unslash( $_GET['error'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( '' !== $error ) {
			self::redirect_with_notice( 'denied', $error );
		}
		if ( '' === $state || '' === $code ) {
			self::redirect_with_notice( 'bad_callback', __( 'The connection attempt was missing required parameters.', 'bmai-assistant' ) );
		}

		$verifier = get_transient( 'bmai_oauth_' . $state );
		delete_transient( 'bmai_oauth_' . $state ); // Single-use, always — even when it turns out to be wrong.
		if ( false === $verifier ) {
			self::redirect_with_notice( 'bad_state', __( 'This connection link expired or was already used. Please try again.', 'bmai-assistant' ) );
		}

		$client_id = get_option( 'bmai_oauth_client_id', '' );
		$response  = wp_remote_post(
			BMAI_OAUTH_ISSUER . '/token',
			array(
				'timeout' => 15,
				'headers' => array( 'content-type' => 'application/x-www-form-urlencoded' ),
				'body'    => array(
					'grant_type'    => 'authorization_code',
					'code'          => $code,
					'redirect_uri'  => self::redirect_uri(),
					'client_id'     => $client_id,
					'code_verifier' => $verifier,
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			self::redirect_with_notice( 'token_failed', $response->get_error_message() );
		}
		$token = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) || empty( $token['access_token'] ) ) {
			self::redirect_with_notice( 'token_failed', isset( $token['error_description'] ) ? $token['error_description'] : __( 'Busymate AI refused the connection.', 'bmai-assistant' ) );
		}

		$workspace = self::fetch_workspace( $token['access_token'] );
		if ( is_wp_error( $workspace ) ) {
			self::redirect_with_notice( 'workspace_failed', $workspace->get_error_message() );
		}

		update_option( 'bmai_workspace_slug', sanitize_text_field( $workspace['workspaceSlug'] ) );
		update_option( 'bmai_embed_origin', esc_url_raw( $workspace['embedOrigin'] ) );
		if ( ! empty( $token['refresh_token'] ) ) {
			update_option( 'bmai_oauth_refresh_token', sanitize_text_field( $token['refresh_token'] ), false );
		}

		self::redirect_with_notice( 'connected', '' );
	}

	/**
	 * `GET /api/plugins/wordpress/workspace` — the one small endpoint this
	 * flow needed beyond the existing authorization server (#2968).
	 *
	 * @param string $access_token A freshly minted, short-lived access token.
	 * @return array|WP_Error {workspaceSlug, embedOrigin} on success.
	 */
	private static function fetch_workspace( $access_token ) {
		$response = wp_remote_get(
			trailingslashit( untrailingslashit( BMAI_DEFAULT_ORIGIN ) ) . 'api/plugins/wordpress/workspace',
			array(
				'timeout' => 15,
				'headers' => array( 'authorization' => 'Bearer ' . $access_token ),
			)
		);
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) || empty( $body['workspaceSlug'] ) || empty( $body['embedOrigin'] ) ) {
			return new WP_Error( 'bmai_workspace_lookup_failed', isset( $body['message'] ) ? $body['message'] : __( 'Could not read this account\'s workspace.', 'bmai-assistant' ) );
		}
		return $body;
	}

	/**
	 * Exchanges the stored refresh token for a fresh, short-lived access
	 * token. Used ONLY by the WooCommerce handshake — nothing else in this
	 * plugin needs a live token after the initial connect.
	 *
	 * @return string|WP_Error
	 */
	public static function get_fresh_access_token() {
		$refresh_token = get_option( 'bmai_oauth_refresh_token', '' );
		$client_id     = get_option( 'bmai_oauth_client_id', '' );
		if ( '' === $refresh_token || '' === $client_id ) {
			return new WP_Error( 'bmai_not_connected', __( 'Connect your Busymate AI account first.', 'bmai-assistant' ) );
		}
		$response = wp_remote_post(
			BMAI_OAUTH_ISSUER . '/token',
			array(
				'timeout' => 15,
				'headers' => array( 'content-type' => 'application/x-www-form-urlencoded' ),
				'body'    => array(
					'grant_type'    => 'refresh_token',
					'refresh_token' => $refresh_token,
					'client_id'     => $client_id,
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$token = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) || empty( $token['access_token'] ) ) {
			return new WP_Error( 'bmai_refresh_failed', __( 'Your Busymate AI connection expired. Reconnect from the settings screen.', 'bmai-assistant' ) );
		}
		if ( ! empty( $token['refresh_token'] ) ) {
			// Rotating refresh tokens (the issuer's own posture) — always store the newest.
			update_option( 'bmai_oauth_refresh_token', sanitize_text_field( $token['refresh_token'] ), false );
		}
		return $token['access_token'];
	}

	/**
	 * admin-post handler: `?action=bmai_oauth_disconnect`. Forgets the
	 * refresh token and OAuth client id; leaves the workspace slug/origin in
	 * place (a merchant who typed them in manually, or wants to reconnect
	 * without losing a currently-working widget, is not forced to re-enter
	 * them) but they are no longer OAuth-backed.
	 *
	 * @return void
	 */
	public static function handle_disconnect() {
		if ( ! current_user_can( bmai_required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to disconnect Busymate AI.', 'bmai-assistant' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bmai_oauth_disconnect' );
		delete_option( 'bmai_oauth_refresh_token' );
		delete_option( 'bmai_oauth_client_id' );
		self::redirect_with_notice( 'disconnected', '' );
	}

	/**
	 * @param string $code    A short machine notice code, read by the settings screen.
	 * @param string $message Optional human-readable detail, carried through the redirect.
	 * @return void This function always exits.
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
