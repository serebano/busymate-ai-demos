<?php
/**
 * Hand-authored dependency manifest for `index.js` (#2968) — this plugin
 * ships with no JS build step, so this file plays the role a `wp-scripts
 * build` would normally generate automatically. WordPress reads it as part
 * of resolving `block.json`'s `"editorScript": "file:./index.js"`.
 *
 * @package Bmai_Assistant
 */
return array(
	'dependencies' => array(
		'wp-blocks',
		'wp-element',
		'wp-block-editor',
		'wp-components',
		'wp-i18n',
		'wp-server-side-render',
	),
	'version'      => BMAI_VERSION,
);
