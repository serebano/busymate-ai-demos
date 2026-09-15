<?php
/**
 * `includes/class-bmai-enqueue.php` — the ONE place that ever calls
 * `wp_enqueue_script()` for `embed/v1.js` (#2968). Per the standing rule,
 * this plugin never hand-edits `header.php` or hooks `wp_head` directly —
 * every load goes through `wp_enqueue_scripts`, so it interacts correctly
 * with other plugins' script/style dependency graphs, cache busting and
 * `defer`/`async` handling.
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

class Bmai_Enqueue {

	/**
	 * @return bool True once a workspace is configured (manually or via
	 *              "Connect your account" — both write the same two options).
	 */
	public static function is_configured() {
		return '' !== get_option( 'bmai_workspace_slug', '' ) && '' !== get_option( 'bmai_embed_origin', '' );
	}

	/**
	 * Site-wide load — the default. A merchant can turn this OFF (bmai_site_wide)
	 * to load the assistant ONLY on pages that carry the block or shortcode
	 * (the roadmap's "load assets only where placed" requirement); the block
	 * and shortcode call {@see self::enqueue()} themselves in that case.
	 *
	 * @return void
	 */
	public static function maybe_enqueue_site_wide() {
		if ( is_admin() ) {
			return;
		}
		if ( ! self::is_configured() ) {
			return;
		}
		if ( ! get_option( 'bmai_site_wide', true ) ) {
			return;
		}
		self::enqueue();
	}

	/**
	 * Registers + enqueues the shared loader. Safe to call more than once per
	 * request (from the site-wide hook AND a block render on the same page) —
	 * `wp_enqueue_script` de-duplicates by handle.
	 *
	 * @return void
	 */
	public static function enqueue() {
		if ( ! self::is_configured() ) {
			return;
		}
		$origin = get_option( 'bmai_embed_origin', '' );
		$src    = trailingslashit( $origin ) . 'embed/v1.js';
		// `null` version + no query string: the platform version-buckets and
		// cache-busts this file itself, and a WordPress-appended `?ver=` query
		// string on a cross-origin script the destination does not expect is
		// exactly the kind of drift a shared loader should never have to
		// tolerate from every embedding site's own cache-busting convention.
		//
		// `in_footer = true` UNCONDITIONALLY: the block and shortcode below
		// call this method from inside `the_content` rendering, which runs
		// AFTER `wp_head` has already printed — a header-queued script
		// enqueued that late would miss its only print pass. Printing in the
		// footer is also simply the better default for a deferred,
		// non-render-blocking third-party widget.
		wp_enqueue_script( BMAI_SCRIPT_HANDLE, $src, array(), null, true );
	}

	/**
	 * Rewrites our own script tag so it carries `data-*` attributes instead of
	 * a WordPress-appended `?ver=` query string, and loads with `defer` (never
	 * blocking, never a race with DOMContentLoaded the way a bare `async`
	 * would be against the loader's own `document.currentScript` read).
	 *
	 * `$tag` is NOT always just our one `<script>` element: WordPress core
	 * concatenates any `wp_add_inline_script()` "before"/"after" content
	 * AROUND the default tag before this filter ever runs
	 * (`WP_Scripts::do_item()`), and `enqueue_with_trigger()` attaches
	 * exactly that kind of "after" script to this SAME handle. An earlier
	 * version of this method returned a hand-built replacement for the
	 * WHOLE `$tag` string, which silently discarded that inline script on
	 * every page that used the block or shortcode (caught live in the
	 * docker/wp-cli smoke test this plugin ships with — #2968). Replacing
	 * only the default element ITSELF, matched by the `id` core always gives
	 * it (`{handle}-js`), leaves any inline sibling exactly where core put
	 * it.
	 *
	 * @param string $tag    The rendered script tag (and any inline siblings).
	 * @param string $handle The script handle.
	 * @param string $src    The script source.
	 * @return string
	 */
	public static function script_loader_tag( $tag, $handle, $src ) {
		if ( BMAI_SCRIPT_HANDLE !== $handle ) {
			return $tag;
		}
		$label      = get_option( 'bmai_label', __( 'Ask us', 'bmai-assistant' ) );
		$aria_label = get_option( 'bmai_aria_label', '' );
		$attrs      = sprintf( ' data-assistant="%s"', esc_attr( get_option( 'bmai_workspace_slug', '' ) ) );
		if ( '' !== $label ) {
			$attrs .= sprintf( ' data-label="%s"', esc_attr( $label ) );
		}
		if ( '' !== $aria_label ) {
			$attrs .= sprintf( ' data-aria-label="%s"', esc_attr( $aria_label ) );
		}
		$replacement = sprintf( '<script id="%1$s-js" src="%2$s"%3$s defer></script>', esc_attr( BMAI_SCRIPT_HANDLE ), esc_url( $src ), $attrs );
		$pattern     = '#<script\b[^>]*\bid=([\'"])' . preg_quote( BMAI_SCRIPT_HANDLE . '-js', '#' ) . '\1[^>]*></script>#';
		$rewritten   = preg_replace( $pattern, $replacement, $tag, 1 );
		return null !== $rewritten && '' !== $rewritten ? $rewritten : $tag;
	}

	/**
	 * Loads the widget AND makes sure the one delegated click-handler for
	 * every inline trigger button on the page (the block, the shortcode, and
	 * anyone else's markup with `data-bmai-trigger`) is present — added
	 * exactly once per page no matter how many trigger elements exist.
	 *
	 * @return void
	 */
	public static function enqueue_with_trigger() {
		self::enqueue();
		if ( wp_script_is( BMAI_SCRIPT_HANDLE . '-trigger', 'done' ) ) {
			return;
		}
		wp_add_inline_script( BMAI_SCRIPT_HANDLE, self::trigger_js(), 'after' );
		// `wp_script_is(..., 'done')` above is a proxy for "already added": an
		// inline script has no handle of its own, so a dedicated marker handle
		// registered with no src records that this ran, without ever being
		// enqueued for output itself.
		wp_register_script( BMAI_SCRIPT_HANDLE . '-trigger', false, array(), null );
		wp_enqueue_script( BMAI_SCRIPT_HANDLE . '-trigger' );
	}

	/**
	 * ES5, dependency-free, delegated (survives content inserted after
	 * page load — a block loaded via lazy-loaded content, a page builder's
	 * AJAX tab). Waits briefly for `window.BusymateAI` on click rather than
	 * assuming the deferred loader has already run, so a click that lands in
	 * the small window before it finishes executing still works.
	 *
	 * @return string
	 */
	private static function trigger_js() {
		return '(function () {'
			. '  function openWithRetry(prompt, tries) {'
			. '    var api = window.BusymateAI;'
			. '    if (api && typeof api.open === "function") {'
			. '      if (prompt && typeof api.ask === "function") { api.ask(prompt); } else { api.open(); }'
			. '      return;'
			. '    }'
			. '    if (tries <= 0) { return; }'
			. '    setTimeout(function () { openWithRetry(prompt, tries - 1); }, 100);'
			. '  }'
			. '  document.addEventListener("click", function (event) {'
			. '    var el = event.target;'
			. '    while (el && el !== document.body) {'
			. '      if (el.hasAttribute && el.hasAttribute("data-bmai-trigger")) {'
			. '        event.preventDefault();'
			. '        openWithRetry(el.getAttribute("data-bmai-prompt") || "", 50);'
			. '        return;'
			. '      }'
			. '      el = el.parentNode;'
			. '    }'
			. '  });'
			. '}());';
	}
}
