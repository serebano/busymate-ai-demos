/**
 * Busymate AI trigger block — editor UI (#2968).
 *
 * Hand-written against WordPress's own global namespaces (`wp.blocks`,
 * `wp.element`, …) rather than JSX, because this plugin ships with no build
 * step (see `index.asset.php`). `ServerSideRender` renders the REAL PHP
 * output (`Bmai_Block::render`), so the editor preview can never drift from
 * what the front end actually shows — including the "connect your account
 * first" message when no workspace is configured yet.
 */
( function ( blocks, element, blockEditor, components, i18n, ServerSideRender ) {
	var el = element.createElement;
	var __ = i18n.__;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;

	blocks.registerBlockType( 'bmai/assistant', {
		edit: function ( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			return el(
				element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Busymate AI', 'bmai-assistant' ) },
						el( TextControl, {
							label: __( 'Button text', 'bmai-assistant' ),
							value: attributes.label,
							onChange: function ( value ) {
								setAttributes( { label: value } );
							},
						} ),
						el( TextControl, {
							label: __( 'Starting question (optional)', 'bmai-assistant' ),
							help: __( 'Sent to the assistant automatically when this button is clicked. Leave blank to just open the assistant.', 'bmai-assistant' ),
							value: attributes.prompt,
							onChange: function ( value ) {
								setAttributes( { prompt: value } );
							},
						} )
					)
				),
				el( ServerSideRender, {
					block: 'bmai/assistant',
					attributes: attributes,
				} )
			);
		},
		// Dynamic block: nothing is saved into post_content beyond the block
		// comment delimiters and attributes — the PHP render_callback is the
		// only source of front-end markup, so it can never drift from the
		// shortcode's identical output.
		save: function () {
			return null;
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.i18n,
	window.wp.serverSideRender
);
