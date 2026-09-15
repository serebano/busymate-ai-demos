<?php
/**
 * The Busymate AI settings screen (#2968). Required, not included directly —
 * `Bmai_Admin::render()` gates it on the capability check.
 *
 * @package Bmai_Assistant
 */

defined( 'ABSPATH' ) || exit;

$connected        = Bmai_Enqueue::is_configured();
$via_oauth        = '' !== get_option( 'bmai_oauth_refresh_token', '' );
$woo_active       = Bmai_Admin::has_woocommerce();
$woo_connected    = Bmai_Woocommerce::is_connected();
$woo_pending      = Bmai_Woocommerce::consume_pending_result();
?>
<div class="wrap bmai-settings">
	<h1><?php echo esc_html__( 'Busymate AI', 'bmai-assistant' ); ?></h1>
	<p>
		<?php
		esc_html_e(
			'Puts your mate on this site. What it says, looks like and can do is served remotely from your workspace, so this plugin never needs updating for that to change.',
			'bmai-assistant'
		);
		?>
	</p>

	<?php if ( null !== $woo_pending ) : ?>
		<?php if ( 'ok' === $woo_pending ) : ?>
			<div class="notice notice-success"><p><?php esc_html_e( 'WooCommerce connected. Your mate can now read this store\'s products and orders.', 'bmai-assistant' ); ?></p></div>
		<?php else : ?>
			<div class="notice notice-error"><p><?php echo esc_html( $woo_pending ); ?></p></div>
		<?php endif; ?>
	<?php endif; ?>

	<h2><?php esc_html_e( 'Connection', 'bmai-assistant' ); ?></h2>
	<?php if ( $connected ) : ?>
		<table class="widefat striped bmai-status-table">
			<tbody>
				<tr>
					<th scope="row"><?php esc_html_e( 'Workspace', 'bmai-assistant' ); ?></th>
					<td><code><?php echo esc_html( get_option( 'bmai_workspace_slug' ) ); ?></code></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Workspace address', 'bmai-assistant' ); ?></th>
					<td><code><?php echo esc_html( get_option( 'bmai_embed_origin' ) ); ?></code></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Connected via', 'bmai-assistant' ); ?></th>
					<td><?php echo $via_oauth ? esc_html__( 'your Busymate AI account (OAuth)', 'bmai-assistant' ) : esc_html__( 'manual setup', 'bmai-assistant' ); ?></td>
				</tr>
			</tbody>
		</table>
		<?php if ( $via_oauth ) : ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'bmai_oauth_disconnect' ); ?>
				<input type="hidden" name="action" value="bmai_oauth_disconnect" />
				<p><button type="submit" class="button"><?php esc_html_e( 'Disconnect account', 'bmai-assistant' ); ?></button></p>
			</form>
		<?php endif; ?>
	<?php else : ?>
		<p><?php esc_html_e( 'Connect the workspace your mate should use on this site.', 'bmai-assistant' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'bmai_oauth_start' ); ?>
			<input type="hidden" name="action" value="bmai_oauth_start" />
			<button type="submit" class="button button-primary bmai-connect-button">
				<?php esc_html_e( 'Connect your Busymate AI account', 'bmai-assistant' ); ?>
			</button>
		</form>
		<p><a href="#" id="bmai-toggle-manual"><?php esc_html_e( 'Or enter your workspace address manually', 'bmai-assistant' ); ?></a></p>
	<?php endif; ?>

	<div id="bmai-manual-setup" class="bmai-manual-setup" <?php echo $connected ? '' : 'hidden'; ?>>
		<h2><?php esc_html_e( 'Manual setup', 'bmai-assistant' ); ?></h2>
		<p><?php esc_html_e( 'Find these on your Busymate AI workspace, under Console → Integrations → WordPress.', 'bmai-assistant' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( BMAI_OPTION_GROUP ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="bmai_workspace_slug"><?php esc_html_e( 'Workspace slug', 'bmai-assistant' ); ?></label></th>
					<td><input type="text" id="bmai_workspace_slug" name="bmai_workspace_slug" class="regular-text" value="<?php echo esc_attr( get_option( 'bmai_workspace_slug', '' ) ); ?>" placeholder="acme-coffee" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="bmai_embed_origin"><?php esc_html_e( 'Workspace address', 'bmai-assistant' ); ?></label></th>
					<td><input type="url" id="bmai_embed_origin" name="bmai_embed_origin" class="regular-text" value="<?php echo esc_attr( get_option( 'bmai_embed_origin', '' ) ); ?>" placeholder="https://acme-coffee.busymate.ai" /></td>
				</tr>
			</table>
			<?php submit_button( __( 'Save workspace', 'bmai-assistant' ) ); ?>
		</form>
	</div>

	<h2><?php esc_html_e( 'Widget', 'bmai-assistant' ); ?></h2>
	<form method="post" action="options.php">
		<?php settings_fields( BMAI_OPTION_GROUP ); ?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="bmai_label"><?php esc_html_e( 'Button text', 'bmai-assistant' ); ?></label></th>
				<td><input type="text" id="bmai_label" name="bmai_label" class="regular-text" value="<?php echo esc_attr( get_option( 'bmai_label', __( 'Ask us', 'bmai-assistant' ) ) ); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="bmai_aria_label"><?php esc_html_e( 'Accessible description (optional)', 'bmai-assistant' ); ?></label></th>
				<td>
					<input type="text" id="bmai_aria_label" name="bmai_aria_label" class="regular-text" value="<?php echo esc_attr( get_option( 'bmai_aria_label', '' ) ); ?>" placeholder="<?php esc_attr_e( 'Open the Acme Coffee assistant', 'bmai-assistant' ); ?>" />
					<p class="description"><?php esc_html_e( 'Read by screen readers in addition to the button text above.', 'bmai-assistant' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Where it loads', 'bmai-assistant' ); ?></th>
				<td>
					<label>
						<input type="checkbox" name="bmai_site_wide" value="1" <?php checked( get_option( 'bmai_site_wide', true ) ); ?> />
						<?php esc_html_e( 'Every page (the usual choice)', 'bmai-assistant' ); ?>
					</label>
					<p class="description">
						<?php
						printf(
							/* translators: 1: the [bmai_assistant] shortcode name, 2: the block name */
							esc_html__( 'Turn this off to load your mate only on pages where you add the %1$s shortcode or the %2$s block.', 'bmai-assistant' ),
							'<code>[bmai_assistant]</code>',
							'<code>' . esc_html__( 'Busymate AI trigger', 'bmai-assistant' ) . '</code>'
						);
						?>
					</p>
				</td>
			</tr>
		</table>
		<?php submit_button(); ?>
	</form>

	<?php if ( $woo_active ) : ?>
		<h2><?php esc_html_e( 'WooCommerce', 'bmai-assistant' ); ?></h2>
		<?php if ( $woo_connected ) : ?>
			<p><?php esc_html_e( 'Connected. Your mate can read this store\'s products and orders to answer customer questions — it never places an order or issues a refund.', 'bmai-assistant' ); ?></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'bmai_woo_disconnect' ); ?>
				<input type="hidden" name="action" value="bmai_woo_disconnect" />
				<button type="submit" class="button"><?php esc_html_e( 'Stop reading this store', 'bmai-assistant' ); ?></button>
			</form>
		<?php elseif ( $connected ) : ?>
			<p><?php esc_html_e( 'Let your mate answer questions about this store\'s products and order status, read-only.', 'bmai-assistant' ); ?></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'bmai_woo_connect' ); ?>
				<input type="hidden" name="action" value="bmai_woo_connect" />
				<button type="submit" class="button button-primary"><?php esc_html_e( 'Connect WooCommerce', 'bmai-assistant' ); ?></button>
			</form>
			<p class="description"><?php esc_html_e( 'Takes you to this store\'s own WooCommerce authorization screen — no key to copy or paste.', 'bmai-assistant' ); ?></p>
		<?php else : ?>
			<p class="description"><?php esc_html_e( 'Connect your Busymate AI account above first.', 'bmai-assistant' ); ?></p>
		<?php endif; ?>
	<?php endif; ?>

	<h2><?php esc_html_e( 'Placing it in content', 'bmai-assistant' ); ?></h2>
	<p>
		<?php esc_html_e( 'The widget above loads as a corner button on every page (or only where you place it, per the setting above). To add a button inside a page or post that opens the same assistant — optionally with a starting question — use the Busymate AI trigger block, or the shortcode:', 'bmai-assistant' ); ?>
	</p>
	<p><code>[bmai_assistant label="Ask about sizing" prompt="What sizes do you have?"]</code></p>
</div>
