<?php
/**
 * Plugin Name: Fernweh — the demonstration itself
 * Description: What makes this store a Busymate AI demo rather than just a shop: the page's own
 *              WebMCP tools, the one-click sign-in that provides the demo customer, the block per
 *              capability explaining what to try and where the guide is, and the footer that says
 *              what the operator sees.
 * Version:     1.1.0
 * Author:      Busymate AI demo playground
 *
 * @package Fernweh_Demo
 */

defined( 'ABSPATH' ) || exit;

const FERNWEH_DEMO_CUSTOMER_EMAIL = 'demo@woo.demo.busymate.ai';
const FERNWEH_SIGNIN_PATH         = '/fernweh-demo-signin';
const FERNWEH_CONTACT_EMAIL       = 'hallo@woo.demo.busymate.ai';

/**
 * The hosted-assistant origins the sign-in redirect may return a visitor to,
 * besides this store itself.
 *
 * The hosted assistant page lives on the platform, not here, so when a visitor
 * clicks "Sign in" in that chat the platform sends `return_to=<its own page>`.
 * Pinning the redirect to this store alone — which is what this did until the
 * round trip was measured — signs the customer in for real and then drops them
 * on the shop's front page: the chat they came from never receives the token and
 * stays a guest, which from the customer's side is indistinguishable from a
 * broken sign-in.
 *
 * TWO hosts, because the hosted page has two addresses and the return lands on
 * whichever one the visitor opened: this workspace's own `fernweh.busymate.ai`
 * (the canonical one — the tenant travels in the HOST, so returning there cold
 * still lands in the Fernweh assistant) and the platform apex used by
 * `busymate.ai/support/fernweh`. A short NAMED allowlist is still not an open
 * redirect; both are compared on the parsed origin, never a prefix.
 */
const FERNWEH_HOSTED_ORIGINS = 'https://fernweh.busymate.ai,https://busymate.ai';

/*
 * ── The page's own tools ────────────────────────────────────────────────────
 * Registered from the page, in the visitor's own session, against the same
 * WooCommerce Store API the theme's buttons post to.
 */

/**
 * @return void
 */
function fernweh_enqueue_page_tools() {
	if ( is_admin() ) {
		return;
	}
	wp_enqueue_script( 'fernweh-page-tools', '/assets/page-tools.js', array(), '1.1.0', true );
}
add_action( 'wp_enqueue_scripts', 'fernweh_enqueue_page_tools', 20 );

/**
 * The bundle is an ES module (it imports its own descriptor file), so the tag
 * has to say so — a classic <script> would die on the first `import`.
 *
 * @param string $tag    Rendered tag.
 * @param string $handle Script handle.
 * @param string $src    Source URL.
 * @return string
 */
function fernweh_module_tag( $tag, $handle, $src ) {
	if ( 'fernweh-page-tools' !== $handle ) {
		return $tag;
	}
	return sprintf( '<script type="module" src="%s"></script>', esc_url( $src ) ) . chr( 10 );
}
add_filter( 'script_loader_tag', 'fernweh_module_tag', 10, 3 );

/**
 * Who is signed in, where the page tool can read it without a network call and
 * without printing anything the store does not already show this visitor.
 *
 * @param string $output Existing language attributes.
 * @return string
 */
function fernweh_html_customer_attribute( $output ) {
	if ( ! is_user_logged_in() ) {
		return $output;
	}
	$user = wp_get_current_user();
	$name = trim( $user->first_name . ' ' . $user->last_name );
	return $output . ' data-fernweh-customer="' . esc_attr( $name ? $name : $user->display_name ) . '"';
}
add_filter( 'language_attributes', 'fernweh_html_customer_attribute' );

/*
 * ── A shim over the Busymate AI plugin's script tag ─────────────────────────
 *
 * MEASURED ON THIS STORE (WordPress 7.1, plugin busymate-ai 1.0.0): the
 * plugin's own `script_loader_tag` filter rebuilds the embed's <script> tag
 * from scratch and returns it, discarding the `$tag` it was handed. In this
 * WordPress that `$tag` ALREADY CONTAINS the handle's inline "before" script —
 * and that inline script is the identity bridge, the thing that defines
 * `window.BusymateAI.getIdentity`. So the bridge was registered, built
 * correctly, and then deleted on the way out:
 *
 *   wp_print_scripts("busymate-ai-embed") with the filter    ->  87 bytes, no bridge
 *   the same call with the filter removed                    -> 1442 bytes, bridge present
 *
 * The failure is silent and it is the worst shape: the widget mounts, the
 * merchant sees it working, and every signed-in customer is treated as a guest
 * forever. It is a bug in the GENERATED plugin, so it would do this on every
 * store that installs one — reported upstream (busymate-devtools#2843/#2842).
 *
 * This shim replaces the filter with one that ADDS the two attributes to the
 * tag it was given instead of rebuilding it, so nothing in `$tag` is lost. It
 * removes itself from the equation entirely if the plugin is not present.
 */

/**
 * @return void
 */
function fernweh_repair_embed_tag_filter() {
	if ( ! function_exists( 'bmai_script_loader_tag' ) || ! defined( 'BMAI_SCRIPT_HANDLE' ) ) {
		return;
	}
	remove_filter( 'script_loader_tag', 'bmai_script_loader_tag', 10 );
	add_filter( 'script_loader_tag', 'fernweh_embed_tag', 10, 3 );
}
add_action( 'wp_enqueue_scripts', 'fernweh_repair_embed_tag_filter', 5 );

/**
 * @param string $tag    The rendered block for this handle, inline scripts included.
 * @param string $handle Script handle.
 * @param string $src    Source URL.
 * @return string
 */
function fernweh_embed_tag( $tag, $handle, $src ) {
	if ( BMAI_SCRIPT_HANDLE !== $handle ) {
		return $tag;
	}
	$attrs   = ' data-assistant="' . esc_attr( BMAI_TENANT_SLUG ) . '" defer';
	$pattern = '#(<script\b)((?:(?!</script>)[^>])*?\ssrc=([\'"])' . preg_quote( $src, '#' ) . '\3(?:(?!</script>)[^>])*?)>#i';
	$count   = 0;
	$patched = preg_replace( $pattern, '$1' . $attrs . '$2>', $tag, 1, $count );
	// No match means this WordPress hands the filter only the bare src element
	// in some shape this pattern does not know. Returning `$tag` untouched is
	// the safe answer — the loader still loads; it simply has no tenant slug and
	// bails, which is visible, rather than an identity bridge silently deleted.
	return $count && is_string( $patched ) ? $patched : $tag;
}

/*
 * ── The provided customer ───────────────────────────────────────────────────
 * Half two of the identity handoff. The embed's getIdentity (half one) is the
 * Busymate AI plugin's job and works for a visitor who is already signed in.
 * This is the REDIRECT half: the assistant's sign-in card sends the visitor
 * here, this signs them in as the one throwaway demo customer, mints the same
 * ES256 launch proof the plugin's /wp-json/busymate/v1/launch mints, and hands
 * it back in the URL FRAGMENT so it never reaches a server log.
 *
 * It can only ever sign in ONE account — the constant above — so it is not a
 * login bypass for the store: there is no parameter that selects a user.
 */

/**
 * @return void
 */
function fernweh_demo_signin() {
	if ( is_admin() ) {
		return;
	}
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
	$path = is_string( $uri ) ? wp_parse_url( $uri, PHP_URL_PATH ) : '';
	if ( FERNWEH_SIGNIN_PATH !== untrailingslashit( (string) $path ) ) {
		return;
	}

	$user = get_user_by( 'email', FERNWEH_DEMO_CUSTOMER_EMAIL );
	if ( ! $user ) {
		status_header( 503 );
		header( 'Content-Type: application/json; charset=utf-8' );
		echo wp_json_encode( array( 'error' => 'demo_customer_missing' ) );
		exit;
	}

	wp_set_current_user( $user->ID );
	wp_set_auth_cookie( $user->ID, false, true );

	// Where to send them back to. Only this store and the ONE platform origin
	// are followed; anything else falls back to the shop — an open redirect on a
	// demo is still an open redirect.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a navigation entry point, not a state change beyond this demo session.
	$requested = isset( $_GET['return_to'] ) ? esc_url_raw( wp_unslash( $_GET['return_to'] ) ) : '';
	$target    = fernweh_allowed_return_to( $requested );

	// The nonce the platform is waiting to see echoed. The launch pair is
	// one-time and BOUND to it: minting our own here signs a perfectly valid
	// token the platform must reject, so the customer lands back in the chat as
	// a guest and nothing says why. A missing or malformed one (the direct
	// full-page open, where nobody asked for a value) gets a fresh one instead.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- this is the platform's one-time launch nonce, not a WordPress form nonce.
	$asked    = isset( $_GET['bmai_nonce'] ) ? sanitize_text_field( wp_unslash( $_GET['bmai_nonce'] ) ) : '';
	$nonce    = preg_match( '/^[A-Za-z0-9_-]{32,200}$/', $asked ) ? $asked : '';
	$fragment = fernweh_launch_fragment( $user->ID, $nonce );
	if ( $fragment ) {
		$target .= ( false === strpos( $target, '#' ) ? '#' : '&' ) . $fragment;
	}

	header( 'Cache-Control: no-store' );
	header( 'Referrer-Policy: no-referrer' );
	wp_redirect( $target, 303 ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- the target is already pinned to home_url above.
	exit;
}
add_action( 'init', 'fernweh_demo_signin', 2 );

/**
 * The EXACT `return_to`, when its origin is one this demo will hand a launch
 * proof to; the shop's front page otherwise.
 *
 * Two origins, both named: this store (the embed's own sign-in, which returns
 * to the page the widget is on) and the platform (the hosted assistant page).
 * The comparison is on the parsed ORIGIN, never a string prefix — `https://
 * busymate.ai.evil.test/` starts with the platform origin and is not it.
 *
 * @param string $requested The raw `return_to` as it arrived.
 * @return string A URL this demo is willing to redirect to.
 */
function fernweh_allowed_return_to( $requested ) {
	$home = home_url( '/' );
	if ( ! $requested ) {
		return $home;
	}
	$parts = wp_parse_url( $requested );
	if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
		return $home;
	}
	if ( 'https' !== strtolower( $parts['scheme'] ) || ! empty( $parts['user'] ) || ! empty( $parts['pass'] ) ) {
		return $home;
	}
	$origin  = 'https://' . strtolower( $parts['host'] ) . ( empty( $parts['port'] ) ? '' : ':' . $parts['port'] );
	$allowed = array_merge(
		array( untrailingslashit( home_url() ) ),
		explode( ',', FERNWEH_HOSTED_ORIGINS )
	);
	return in_array( $origin, $allowed, true ) ? $requested : $home;
}

/**
 * The launch proof, signed by the Busymate AI plugin's own key with the claim
 * set its REST route uses. Built here rather than duplicated: if the plugin is
 * not active there is no key and no fragment, and the redirect still works —
 * the visitor is simply signed in to the store without an identified chat.
 *
 * @param int    $user_id The signed-in user.
 * @param string $nonce   The nonce the caller asked to have echoed; '' mints one.
 * @return string The URL fragment, or '' when identity is unavailable.
 */
function fernweh_launch_fragment( $user_id, $nonce = '' ) {
	if ( ! class_exists( 'Bmai_Keys' ) || ! defined( 'BMAI_TENANT_ID' ) ) {
		return '';
	}
	if ( ! $nonce ) {
		$nonce = rtrim( strtr( base64_encode( random_bytes( 24 ) ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- base64url, not obfuscation.
	}
	$now    = time();
	$claims = array(
		'iss'             => class_exists( 'Bmai_Rest' ) ? Bmai_Rest::issuer() : untrailingslashit( home_url() ),
		'aud'             => BMAI_AUDIENCE,
		'sub'             => (string) $user_id,
		BMAI_TENANT_CLAIM => BMAI_TENANT_ID,
		'nonce'           => $nonce,
		'jti'             => wp_generate_uuid4(),
		'iat'             => $now,
		'exp'             => $now + BMAI_TOKEN_TTL,
	);
	// The SAME filter the plugin's own /launch route applies, so the redirect
	// half and the getIdentity half sign an identical claim set. Minting one of
	// them by hand without this is how the two halves drift.
	$claims = apply_filters( 'busymate_ai_launch_claims', $claims, $user_id );
	$token  = Bmai_Keys::sign_jwt( $claims );
	if ( is_wp_error( $token ) || ! is_string( $token ) ) {
		return '';
	}
	return 'bmai_token=' . rawurlencode( $token ) . '&bmai_nonce=' . rawurlencode( $nonce );
}

/**
 * The two display claims the platform projects, added through the Busymate AI
 * plugin's OWN filter rather than by editing it.
 *
 * WHY AN EMAIL, when the plugin's docblock says not to add one. The order desk
 * resolves a customer's VERIFIED email from the claims the store signed, and it
 * is deliberately the only source it will take — an email a visitor TYPES is
 * not verified, and accepting one would turn "where is my order" into an order
 * lookup oracle for anybody who can guess an address. With no email claim the
 * gate refuses every lookup with `no_verified_email`, which is correct and
 * useless. The plugin's warning is about a store that does NOT need the claim;
 * this one does, and it is minted for the signed-in user only, over TLS, into a
 * 120-second single-use proof.
 *
 * The customer here is invented: `demo@woo.demo.busymate.ai` is a mailbox on the
 * store's own demonstration domain, so no real person's address is ever signed.
 *
 * @param array $claims  The claim set the plugin is about to sign.
 * @param int   $user_id The signed-in user.
 * @return array
 */
function fernweh_launch_display_claims( $claims, $user_id ) {
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return $claims;
	}
	$name = trim( $user->first_name . ' ' . $user->last_name );
	$claims['name']  = $name ? $name : $user->display_name;
	$claims['email'] = $user->user_email;
	return $claims;
}
add_filter( 'busymate_ai_launch_claims', 'fernweh_launch_display_claims', 10, 2 );

/*
 * ── What this demo is showing ───────────────────────────────────────────────
 * One block per capability: what it demonstrates, a line to try in the chat,
 * and the guide for doing the same on a real store. Rendered on the shop front
 * page, under the products, where a visitor lands.
 */

/**
 * @return array<int, array<string, string>>
 */
function fernweh_capabilities() {
	$docs = 'https://busymate.ai/docs/guides/';
	return array(
		array(
			'title' => 'It answers from this shop, and says where from',
			'body'  => 'The assistant is grounded in this store\'s own catalogue and its shipping, returns, privacy and terms pages — and nothing else. Ask it something only this shop knows and it answers with the real number; ask it something outside and it says so rather than inventing one.',
			'try'   => 'What is the Wanderweg made of, and how much does it weigh empty?',
			'link'  => $docs . 'knowledge',
			'label' => 'Teach an assistant your own content',
		),
		array(
			'title' => 'It can use the page you are on',
			'body'  => 'Six of this page\'s own actions are published to the assistant over WebMCP — search the range, read the cart, add a line, take one out, open a product, and check who is signed in. They run in your browser, in your session, through the same WooCommerce endpoints the buttons use, so nothing happens that you could not do by clicking. The list is readable without running the page at /webmcp-catalog.json.',
			'try'   => 'Put a pair of merino socks in my cart, then tell me what is in it.',
			'link'  => $docs . 'page-tools',
			'label' => 'Publish your page\'s actions',
		),
		array(
			'title' => 'It can reach the systems behind the shop',
			'body'  => 'This store runs its own MCP server at /mcp. Three tools on it are open to anyone — search the range, read one product in full, read the delivery and returns tables — and three answer only about the customer whose identity the caller can prove. It advertises nothing it cannot serve.',
			'try'   => 'Which packs under €150 are in stock right now?',
			'link'  => $docs . 'connect-mcp-server',
			'label' => 'Connect your own MCP server',
		),
		array(
			'title' => 'It is a WooCommerce shop, connected as one',
			'body'  => 'Under the storefront is a real WooCommerce installation: fourteen products with SKUs, stock counts, weights and dimensions, four shipping zones, a customer, five orders, and an open REST API. A merchant connects theirs the same way — the store\'s own REST keys on the workspace — so the assistant reads the live catalogue instead of a copy of it.',
			'try'   => 'What is the Quelle 1L made of, and how many are left?',
			'link'  => $docs . 'woocommerce',
			'label' => 'Connect your WooCommerce store',
		),
		array(
			'title' => 'It knows who you are, once you say so',
			'body'  => 'A demo customer is provided — Mara Oertel, with five real orders in five different states. Ask about an order and a sign-in card appears in the conversation; one click signs you in to this store and returns you to the same conversation, identified. The store signs a short-lived proof with its own key, which the platform checks against the key set this store publishes. No password is shared and no account is created.',
			'try'   => 'Where has my last order got to?',
			'link'  => $docs . 'identified-visitors',
			'label' => 'Recognise your signed-in customers',
		),
		array(
			'title' => 'It asks with a form, not a paragraph',
			'body'  => 'When the assistant needs structured details — which order, which item, why it is going back — it mounts a card with real fields and a button inside the chat instead of listing things for you to type. Submitting the card calls the tool straight back.',
			'try'   => 'I would like to return something from order 53.',
			'link'  => $docs . 'form-cards',
			'label' => 'Ask with a card',
		),
		array(
			'title' => 'It hands you to a person',
			'body'  => 'Ask for a human and the conversation is queued to this workspace\'s Inbox. An operator sees the whole transcript, who the visitor is if they signed in, which tools ran and what each one answered, and can take the conversation over mid-thread — the visitor keeps the same chat window.',
			'try'   => 'Can I talk to a person about a repair?',
			'link'  => $docs . 'human-handoff-setup',
			'label' => 'Set up human handoff',
		),
		array(
			'title' => 'It is readable without a browser',
			'body'  => 'Every layer an agent looks for is served by this store: /llms.txt, /llms-full.txt, /agents.json and its /.well-known twin, /webmcp-catalog.json, a sitemap built from what is really published, and a robots.txt that names each AI crawler instead of leaving them to guess.',
			'try'   => 'Read this shop\'s llms.txt and tell me what it can do.',
			'link'  => 'https://busymate.ai/tools',
			'label' => 'Check your own site',
		),
	);
}

/**
 * @return void
 */
function fernweh_render_capabilities() {
	if ( ! ( is_front_page() || is_shop() ) ) {
		return;
	}
	$rows = fernweh_capabilities();
	echo '<section id="what-this-demo-shows" class="fernweh-demo">';
	echo '<div class="fernweh-demo__inner">';
	echo '<p class="fernweh-demo__eyebrow">A Busymate AI demonstration</p>';
	echo '<h2 class="fernweh-demo__title">Everything on this shop, and how to put it on yours</h2>';
	echo '<p class="fernweh-demo__lede">Fernweh Supply Co. is invented and sells nothing — the WooCommerce store under it is real, and so is every capability below. Open the chat and try the line under each one.</p>';
	echo '<div class="fernweh-demo__grid">';
	foreach ( $rows as $row ) {
		echo '<article class="fernweh-card">';
		echo '<h3>' . esc_html( $row['title'] ) . '</h3>';
		echo '<p>' . esc_html( $row['body'] ) . '</p>';
		echo '<p class="fernweh-card__try"><span>Try it</span> “' . esc_html( $row['try'] ) . '”</p>';
		echo '<p class="fernweh-card__link"><a href="' . esc_url( $row['link'] ) . '" rel="noopener">' . esc_html( $row['label'] ) . ' &rarr;</a></p>';
		echo '</article>';
	}
	echo '</div>';

	echo '<div class="fernweh-demo__foot">';
	echo '<h3>What the operator sees</h3>';
	echo '<p>Every conversation on this shop lands in the workspace Inbox: the full transcript, the tool calls and their answers, and — once a visitor has used the sign-in card — which customer account they are. An operator can reply in the same thread, and the visitor sees it in the same chat window they were already using. Asking for a person is what queues it.</p>';
	echo '<p class="fernweh-demo__contact">Prefer email? <a href="mailto:' . esc_attr( FERNWEH_CONTACT_EMAIL ) . '">' . esc_html( FERNWEH_CONTACT_EMAIL ) . '</a> — a demonstration address on this store\'s own domain, so there is no real person\'s inbox in the story.</p>';
	echo '<p class="fernweh-demo__agents">Reading this as an agent? <a href="/llms.txt">/llms.txt</a> · <a href="/llms-full.txt">/llms-full.txt</a> · <a href="/.well-known/agents.json">/agents.json</a> · <a href="/webmcp-catalog.json">/webmcp-catalog.json</a> · <a href="/sitemap.xml">/sitemap.xml</a> · <a href="/mcp">/mcp</a> · <a href="/img/CREDITS.md">Photography credits</a></p>';
	echo '</div>';
	echo '</div></section>';
}
add_action( 'woocommerce_after_main_content', 'fernweh_render_capabilities', 20 );

/**
 * A demonstration store says so on every page, and offers the same person.
 *
 * @return void
 */
function fernweh_footer_note() {
	echo '<p class="fernweh-footnote">This is a Busymate AI demonstration store. Nothing is dispatched, no payment is taken, and no real personal data should be entered. Questions: <a href="mailto:' . esc_attr( FERNWEH_CONTACT_EMAIL ) . '">' . esc_html( FERNWEH_CONTACT_EMAIL ) . '</a>.</p>';
}
add_action( 'storefront_footer', 'fernweh_footer_note', 40 );

/**
 * The demo section's styling. Inline and small: the theme is not ours to fork,
 * and one stylesheet request for eight rules is a worse trade than the bytes.
 *
 * @return void
 */
function fernweh_styles() {
	if ( is_admin() ) {
		return;
	}
	$css = '
/* The shop commits to ONE look — a light paper ground under a dark teal demo
   panel — and says so, rather than leaving it to chance. Without this line a
   dark-mode browser force-darkens the form controls, the select on the shop
   page and the quantity spinners into a palette the rest of the page does not
   share, which is the shape of a half-done dark mode. The assistant is NOT
   affected: the widget renders in a frame the platform owns and follows the
   theme of whoever is looking, which is how it is checked in both. */
html{color-scheme:light}
/* clear:both is not decoration. Storefront FLOATS its main column, and this
   section is a static sibling of it inside .col-full, so without the clear it
   began at the TOP of the float and its dark teal painted 3,800px straight
   through the product grid — measured: the panel box started at y=320 while the
   shop content it is supposed to follow ran to y=1979. */
.fernweh-demo{clear:both;background:#1e4046;color:#f6f1e7;margin:3rem 0 0;padding:3rem 1.5rem}
.fernweh-demo__inner{max-width:66rem;margin:0 auto}
.fernweh-demo__eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:.75rem;color:#c08a3e;margin:0 0 .5rem}
.fernweh-demo__title{color:#f6f1e7;margin:0 0 .75rem;font-size:1.75rem;line-height:1.2}
.fernweh-demo__lede{color:rgba(246,241,231,.82);margin:0 0 2rem;max-width:46rem}
.fernweh-demo__grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))}
.fernweh-card{background:rgba(246,241,231,.06);border:1px solid rgba(246,241,231,.16);border-radius:.6rem;padding:1.25rem}
.fernweh-card h3{color:#f6f1e7;font-size:1.05rem;margin:0 0 .5rem;line-height:1.3}
.fernweh-card p{color:rgba(246,241,231,.8);font-size:.92rem;line-height:1.55;margin:0 0 .75rem}
.fernweh-card__try{border-left:2px solid #c08a3e;padding-left:.75rem;color:#f6f1e7!important}
.fernweh-card__try span{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:.75rem;color:#c08a3e}
.fernweh-card__link a,.fernweh-demo a{color:#e3b877;text-decoration:underline}
.fernweh-demo__foot{margin-top:2rem;border-top:1px solid rgba(246,241,231,.18);padding-top:1.5rem}
.fernweh-demo__foot h3{color:#f6f1e7;font-size:1.05rem;margin:0 0 .5rem}
.fernweh-demo__foot p{color:rgba(246,241,231,.8);font-size:.92rem;line-height:1.55;margin:0 0 .6rem}
.fernweh-demo__agents{word-break:break-word}
.fernweh-footnote{max-width:66rem;margin:1.5rem auto 0;font-size:.85rem;opacity:.75;padding:0 1.5rem}
@media(max-width:600px){.fernweh-demo{padding:2rem 1rem}.fernweh-demo__title{font-size:1.4rem}.fernweh-demo__grid{grid-template-columns:1fr}}
';
	wp_register_style( 'fernweh-demo', false, array(), '1.1.0' );
	wp_enqueue_style( 'fernweh-demo' );
	wp_add_inline_style( 'fernweh-demo', $css );
}
add_action( 'wp_enqueue_scripts', 'fernweh_styles', 21 );

/**
 * A demonstration store has no pingback endpoint to advertise — xmlrpc.php is
 * 404 at the edge, so the theme's <link rel="pingback"> and the RSD link were
 * both pointing an agent at a dead URL. An honest page does not.
 *
 * @return void
 */
function fernweh_drop_dead_head_links() {
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
}
add_action( 'init', 'fernweh_drop_dead_head_links' );

/**
 * Storefront prints the pingback URL straight from bloginfo(), so the only way
 * to stop it naming xmlrpc.php is to empty the value it asks for.
 *
 * @param string $output The value bloginfo() is about to print.
 * @param string $show   Which value was asked for.
 * @return string
 */
function fernweh_blank_pingback_url( $output, $show ) {
	return 'pingback_url' === $show ? '' : $output;
}
add_filter( 'bloginfo_url', 'fernweh_blank_pingback_url', 10, 2 );
add_filter( 'pings_open', '__return_false' );

/**
 * @return void
 */
function fernweh_drop_pingback_header() {
	header_remove( 'X-Pingback' );
}
add_action( 'send_headers', 'fernweh_drop_pingback_header' );
