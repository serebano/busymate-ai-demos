<?php
/**
 * `includes/class-bmai-block.php` — the Gutenberg block (#2968). A DYNAMIC
 * block (server `render_callback`, registered from `blocks/assistant/block.json`)
 * so the SAME markup helper backs both this and the `[bmai_assistant]`
 * shortcode, and so assets load only on a page that actually places it —
 * never site-wide by default just because the plugin is active.
 *
 * `register_block_type()` accepting a directory (reading its `block.json`)
 * has worked since WordPress 5.8, well within this plugin's "Requires at
 * least: 6.0" floor — no need for the newer `block.json`-only `render`
 * field, which would raise that floor to 6.5 for no benefit here.
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Block {

	/**
	 * @return void
	 */
	public static function register_type() {
		register_block_type(
			BMAI_PLUGIN_DIR . 'blocks/assistant',
			array( 'render_callback' => array( __CLASS__, 'render' ) )
		);
	}

	/**
	 * @param array $attributes Block attributes: label, prompt.
	 * @return string
	 */
	public static function render( $attributes ) {
		if ( ! Bmai_Enqueue::is_configured() ) {
			if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
				// The editor's ServerSideRender preview: say WHY nothing shows,
				// rather than rendering nothing with no explanation.
				return sprintf(
					'<p>%s</p>',
					esc_html__( 'Connect your Busymate AI account (Settings → Busymate AI) to preview this block.', 'bmai-assistant' )
				);
			}
			return '';
		}
		$label  = isset( $attributes['label'] ) ? (string) $attributes['label'] : __( 'Ask us about this', 'bmai-assistant' );
		$prompt = isset( $attributes['prompt'] ) ? (string) $attributes['prompt'] : '';
		Bmai_Enqueue::enqueue_with_trigger();
		return self::render_trigger_markup( $label, $prompt );
	}

	/**
	 * The one markup both the block and the shortcode emit — a content
	 * button wired to the delegated click-handler in class-bmai-enqueue.php.
	 *
	 * @param string $label  Visible button text.
	 * @param string $prompt Optional starting question; empty just opens the panel.
	 * @return string
	 */
	public static function render_trigger_markup( $label, $prompt ) {
		$label = '' !== trim( (string) $label ) ? $label : __( 'Ask us about this', 'bmai-assistant' );
		return sprintf(
			'<button type="button" class="wp-block-button__link bmai-assistant-trigger" data-bmai-trigger%2$s>%1$s</button>',
			esc_html( $label ),
			'' !== trim( (string) $prompt ) ? sprintf( ' data-bmai-prompt="%s"', esc_attr( $prompt ) ) : ''
		);
	}
}
