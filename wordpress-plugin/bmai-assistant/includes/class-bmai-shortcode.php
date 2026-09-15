<?php
/**
 * `includes/class-bmai-shortcode.php` — `[bmai_assistant]` (#2968), the
 * classic-editor / page-builder path onto the SAME inline trigger the
 * Gutenberg block renders (class-bmai-block.php). Two authoring surfaces,
 * one markup helper, so they can never drift apart.
 *
 * ── WHY A TRIGGER BUTTON, NOT AN EMBEDDED CHAT PANE ──────────────────────
 * `embed/v1.js` renders the assistant as a fixed corner launcher + panel —
 * by deliberate, owner-set design the launcher always owns bottom-right
 * (#2460) and there is no "render inline in the page flow" mode to ask it
 * for. So the honest inline placement this shortcode/block offers is a
 * button IN the content that opens that same panel (optionally with a
 * starting question, via `BusymateAI.ask()`) — not a fabricated second
 * rendering mode the loader does not have.
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Shortcode {

	/**
	 * @return void
	 */
	public static function register() {
		add_shortcode( 'bmai_assistant', array( __CLASS__, 'render' ) );
	}

	/**
	 * @param array $atts Shortcode attributes: label, prompt.
	 * @return string
	 */
	public static function render( $atts ) {
		if ( ! Bmai_Enqueue::is_configured() ) {
			return '';
		}
		$atts = shortcode_atts(
			array(
				'label'  => __( 'Ask us about this', 'bmai-assistant' ),
				'prompt' => '',
			),
			$atts,
			'bmai_assistant'
		);
		Bmai_Enqueue::enqueue_with_trigger();
		return Bmai_Block::render_trigger_markup( $atts['label'], $atts['prompt'] );
	}
}
