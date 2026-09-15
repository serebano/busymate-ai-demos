/**
 * Busymate AI settings screen — progressive disclosure for the manual-setup
 * fallback only. ES5, dependency-free (jQuery is not assumed).
 */
( function () {
	document.addEventListener( 'DOMContentLoaded', function () {
		var toggle = document.getElementById( 'bmai-toggle-manual' );
		var panel = document.getElementById( 'bmai-manual-setup' );
		if ( ! toggle || ! panel ) {
			return;
		}
		toggle.addEventListener( 'click', function ( event ) {
			event.preventDefault();
			panel.hidden = false;
			toggle.hidden = true;
		} );
	} );
} )();
