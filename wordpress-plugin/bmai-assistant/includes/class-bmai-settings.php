<?php
/**
 * `includes/class-bmai-settings.php` — the Settings API registration.
 *
 * Every value a merchant can change lives here, via `register_setting()` +
 * the `options` table — never a constant, never a hardcoded default baked
 * into a template. "Connect your account" (class-bmai-oauth-connect.php)
 * writes the SAME options this class registers; it is a friendlier way to
 * fill them in, never a second source of truth.
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Settings {

	const SLUG_RE = '/^[a-z0-9][a-z0-9-]{0,62}$/';

	/**
	 * @return void
	 */
	public static function register() {
		register_setting(
			BMAI_OPTION_GROUP,
			'bmai_workspace_slug',
			array(
				'type'              => 'string',
				'sanitize_callback' => array( __CLASS__, 'sanitize_slug' ),
				'default'           => '',
			)
		);
		register_setting(
			BMAI_OPTION_GROUP,
			'bmai_embed_origin',
			array(
				'type'              => 'string',
				'sanitize_callback' => array( __CLASS__, 'sanitize_origin' ),
				'default'           => '',
			)
		);
		register_setting(
			BMAI_OPTION_GROUP,
			'bmai_label',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => __( 'Ask us', 'bmai-assistant' ),
			)
		);
		register_setting(
			BMAI_OPTION_GROUP,
			'bmai_aria_label',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
		register_setting(
			BMAI_OPTION_GROUP,
			'bmai_site_wide',
			array(
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'default'           => true,
			)
		);
		// `bmai_woo_enabled` is deliberately NOT registered here. It is a
		// STATUS flag, true only once class-bmai-woocommerce.php's own
		// handshake (WooCommerce's own wc-auth app-authorization endpoint,
		// then this plugin's backend verify call) has actually succeeded —
		// a plain settings-form checkbox would let it be turned "on" with
		// nothing behind it, which is exactly the kind of placeholder
		// functionality this plugin does not ship.
	}

	/**
	 * A workspace slug is the PUBLIC `data-assistant` value that ends up in
	 * every page's HTML — same shape the Console itself issues, never a
	 * secret. Anything that fails the shape is dropped rather than stored
	 * broken: an assistant that silently fails to mount is a worse merchant
	 * experience than a rejected save with a visible admin notice.
	 *
	 * @param string $value Raw input.
	 * @return string
	 */
	public static function sanitize_slug( $value ) {
		$value = strtolower( trim( (string) $value ) );
		if ( '' === $value ) {
			return '';
		}
		if ( ! preg_match( self::SLUG_RE, $value ) ) {
			add_settings_error(
				'bmai_workspace_slug',
				'bmai_invalid_slug',
				__( 'Workspace slug looks wrong — it should be lowercase letters, numbers and hyphens only, the same slug your Busymate AI workspace URL uses.', 'bmai-assistant' )
			);
			return get_option( 'bmai_workspace_slug', '' );
		}
		return $value;
	}

	/**
	 * The embed origin MUST be https and MUST carry no path — the loader
	 * derives the entire frame URL and postMessage origin allowlist from it
	 * (`embed/v1.js`), so a wrong value here does not degrade gracefully, it
	 * breaks the widget outright. Refusing early beats debugging a blank
	 * corner pill later.
	 *
	 * @param string $value Raw input.
	 * @return string
	 */
	public static function sanitize_origin( $value ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return '';
		}
		$parts = wp_parse_url( $value );
		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			add_settings_error( 'bmai_embed_origin', 'bmai_invalid_origin', __( 'That does not look like a full address, e.g. https://your-workspace.busymate.ai', 'bmai-assistant' ) );
			return get_option( 'bmai_embed_origin', '' );
		}
		if ( 'https' !== $parts['scheme'] ) {
			add_settings_error( 'bmai_embed_origin', 'bmai_insecure_origin', __( 'The workspace address must start with https://.', 'bmai-assistant' ) );
			return get_option( 'bmai_embed_origin', '' );
		}
		if ( ! empty( $parts['path'] ) && '/' !== $parts['path'] ) {
			add_settings_error( 'bmai_embed_origin', 'bmai_origin_has_path', __( 'The workspace address should be the site root, with no path after the domain.', 'bmai-assistant' ) );
			return get_option( 'bmai_embed_origin', '' );
		}
		return 'https://' . $parts['host'] . ( isset( $parts['port'] ) ? ':' . $parts['port'] : '' );
	}

}
