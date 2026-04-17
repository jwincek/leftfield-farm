/**
 * Stand Status Banner — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components, data ) {
	'use strict';

	var el = element.createElement;
	var Fragment = element.Fragment;
	var useState = element.useState;
	var useEffect = element.useEffect;
	var registerBlockType = blocks.registerBlockType;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var ToggleControl = components.ToggleControl;
	var SelectControl = components.SelectControl;
	var ComboboxControl = components.ComboboxControl;
	var Placeholder = components.Placeholder;
	var Spinner = components.Spinner;
	var useSelect = data.useSelect;

	function getRestBase() {
		return ( window.lfufStandSettings || window.lfufSettings || {} ).restBase || '/wp-json/lfuf/v1';
	}

	/**
	 * Format an ISO 8601 timestamp as relative time, matching view.js logic.
	 */
	function formatTimeAgo( isoString ) {
		if ( ! isoString ) return '';
		var then = new Date( isoString );
		var now = new Date();
		var diff = Math.floor( ( now - then ) / 1000 );

		if ( diff < 60 ) return 'just now';
		if ( diff < 3600 ) {
			var mins = Math.floor( diff / 60 );
			return mins + ' minute' + ( mins === 1 ? '' : 's' ) + ' ago';
		}
		if ( diff < 86400 ) {
			var hrs = Math.floor( diff / 3600 );
			return hrs + ' hour' + ( hrs === 1 ? '' : 's' ) + ' ago';
		}
		var days = Math.floor( diff / 86400 );
		return days + ' day' + ( days === 1 ? '' : 's' ) + ' ago';
	}

	/**
	 * Format a YYYY-MM-DD date string for display.
	 * short = "Apr 15", long = "April 15".
	 */
	function formatDate( dateStr, style ) {
		if ( ! dateStr ) return '';
		var d = new Date( dateStr + 'T00:00:00' );
		if ( isNaN( d ) ) return dateStr;
		var month = style === 'short' ? 'short' : 'long';
		return d.toLocaleDateString( undefined, { month: month, day: 'numeric' } );
	}

	registerBlockType( 'lfuf/stand-status-banner', {
		edit: function EditBanner( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var locationId = attributes.locationId;
			var showAddress = attributes.showAddress;
			var showHours = attributes.showHours;
			var showVenmo = attributes.showVenmo;
			var showSeasonDates = attributes.showSeasonDates;
			var layout = attributes.layout;
			var pollingEnabled = attributes.pollingEnabled;

			// Stand data from REST.
			var _stand = useState( null );
			var stand = _stand[0];
			var setStand = _stand[1];

			var _loading = useState( false );
			var loading = _loading[0];
			var setLoading = _loading[1];

			var _error = useState( '' );
			var error = _error[0];
			var setError = _error[1];

			// Fetch stand info when locationId changes.
			useEffect( function () {
				if ( ! locationId ) {
					setStand( null );
					return;
				}
				setLoading( true );
				setError( '' );
				fetch( getRestBase() + '/stand/' + locationId + '/info' )
					.then( function ( r ) {
						if ( ! r.ok ) throw new Error( r.status + ' ' + r.statusText );
						return r.json();
					} )
					.then( function ( data ) {
						setStand( data );
						setLoading( false );
					} )
					.catch( function ( err ) {
						setError( 'Could not load stand data.' );
						setStand( null );
						setLoading( false );
					} );
			}, [ locationId ] );

			// Location list for the picker.
			var locations = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_location', {
					per_page: 50,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var options = locations.map( function ( l ) {
				return { value: l.id, label: l.title?.rendered || '(untitled)' };
			} );

			// Derive display values from stand data.
			var statusSlug = stand ? ( stand.is_open ? 'open' : 'closed' ) : 'closed';
			var statusLabel = stand ? ( stand.is_open ? 'Open Now' : 'Closed' ) : '';
			var timeAgo = stand ? formatTimeAgo( stand.last_toggled ) : '';
			var venmoUrl = ( stand && stand.venmo_handle )
				? 'https://venmo.com/' + stand.venmo_handle.replace( /^@/, '' )
				: '';
			var hasSeasonDates = stand && stand.season_start && stand.season_end;

			var blockProps = useBlockProps( {
				className: 'lfuf-stand-banner lfuf-stand-banner--' + layout +
					( stand ? ' lfuf-stand-banner--' + statusSlug : '' ),
			} );

			// --- Render ---

			// No location selected: show placeholder with inline picker.
			if ( ! locationId ) {
				return el(
					Fragment,
					null,
					renderInspector(),
					el(
						'div',
						blockProps,
						el(
							Placeholder,
							{ icon: 'store', label: 'Stand Status Banner' },
							el( ComboboxControl, {
								label: 'Select a location',
								value: '',
								options: options,
								onChange: function ( val ) {
									setAttributes( { locationId: val ? Number( val ) : 0 } );
								},
							} )
						)
					)
				);
			}

			// Loading state.
			if ( loading ) {
				return el(
					Fragment,
					null,
					renderInspector(),
					el(
						'div',
						blockProps,
						el( 'div', { className: 'lfuf-stand-banner__loading' },
							el( Spinner ),
							' Loading stand status…'
						)
					)
				);
			}

			// Error state.
			if ( error || ! stand ) {
				return el(
					Fragment,
					null,
					renderInspector(),
					el(
						'div',
						blockProps,
						el( Placeholder, {
							icon: 'warning',
							label: 'Stand Status Banner',
							instructions: error || 'Stand data unavailable. Check that this location is still published.',
						} )
					)
				);
			}

			// Live preview — mirrors render.php structure.
			return el(
				Fragment,
				null,
				renderInspector(),
				el(
					'section',
					blockProps,

					// Main status area.
					el( 'div', { className: 'lfuf-stand-banner__main' },
						el( 'div', { className: 'lfuf-stand-banner__status-row' },
							el( 'span', {
								className: 'lfuf-stand-banner__indicator lfuf-stand-banner__indicator--' + statusSlug,
							} ),
							el( 'span', { className: 'lfuf-stand-banner__status-label' }, statusLabel )
						),
						el( 'h2', { className: 'lfuf-stand-banner__name' }, stand.name ),
						stand.status_message
							? el( 'p', { className: 'lfuf-stand-banner__message' }, stand.status_message )
							: null,
						( ! stand.is_open && stand.next_open )
							? el( 'p', { className: 'lfuf-stand-banner__next-open' }, 'Next open: ' + stand.next_open )
							: null,
						timeAgo
							? el( 'span', { className: 'lfuf-stand-banner__updated' }, 'Updated ' + timeAgo )
							: null
					),

					// Details area.
					el( 'div', { className: 'lfuf-stand-banner__details' },
						// Off-season notice.
						( ! stand.in_season && showSeasonDates && hasSeasonDates )
							? el( 'p', { className: 'lfuf-stand-banner__off-season' },
								'Our season runs ' + formatDate( stand.season_start, 'long' ) +
								' – ' + formatDate( stand.season_end, 'long' ) + '. See you then!'
							)
							: null,
						// In-season note.
						( stand.in_season && showSeasonDates && hasSeasonDates )
							? el( 'p', { className: 'lfuf-stand-banner__season-note' },
								'Season: ' + formatDate( stand.season_start, 'short' ) +
								' – ' + formatDate( stand.season_end, 'short' )
							)
							: null,
						// Address.
						( showAddress && stand.address )
							? el( 'p', { className: 'lfuf-stand-banner__address' },
								el( 'span', { className: 'lfuf-stand-banner__icon', 'aria-hidden': 'true' }, '\uD83D\uDCCD' ),
								stand.address
							)
							: null,
						// Hours.
						( showHours && stand.hours )
							? el( 'p', { className: 'lfuf-stand-banner__hours' },
								el( 'span', { className: 'lfuf-stand-banner__icon', 'aria-hidden': 'true' }, '\uD83D\uDD50' ),
								stand.hours
							)
							: null,
						// Venmo.
						( showVenmo && venmoUrl )
							? el( 'span', { className: 'lfuf-stand-banner__venmo-link' },
								el( 'span', { className: 'lfuf-stand-banner__icon', 'aria-hidden': 'true' }, '\uD83D\uDCB8' ),
								'Pay with Venmo (@' + stand.venmo_handle.replace( /^@/, '' ) + ')'
							)
							: null
					)
				)
			);

			/**
			 * Sidebar inspector — extracted to avoid repeating in every branch.
			 */
			function renderInspector() {
				return el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Stand Selection', initialOpen: true },
						el( ComboboxControl, {
							label: 'Location',
							value: locationId || '',
							options: options,
							onChange: function ( val ) {
								setAttributes( { locationId: val ? Number( val ) : 0 } );
							},
						} )
					),
					el(
						PanelBody,
						{ title: 'Display Options', initialOpen: true },
						el( SelectControl, {
							label: 'Layout',
							value: layout,
							options: [
								{ label: 'Full Banner', value: 'banner' },
								{ label: 'Compact Strip', value: 'compact' },
								{ label: 'Card', value: 'card' },
							],
							onChange: function ( val ) {
								setAttributes( { layout: val } );
							},
						} ),
						el( ToggleControl, {
							label: 'Show address',
							checked: showAddress,
							onChange: function ( val ) { setAttributes( { showAddress: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show hours',
							checked: showHours,
							onChange: function ( val ) { setAttributes( { showHours: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show Venmo link',
							checked: showVenmo,
							onChange: function ( val ) { setAttributes( { showVenmo: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show season dates',
							checked: showSeasonDates,
							onChange: function ( val ) { setAttributes( { showSeasonDates: val } ); },
						} )
					),
					el(
						PanelBody,
						{ title: 'Live Updates', initialOpen: false },
						el( ToggleControl, {
							label: 'Auto-refresh status (polls every 60s)',
							checked: pollingEnabled,
							onChange: function ( val ) { setAttributes( { pollingEnabled: val } ); },
						} )
					)
				);
			}
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.data
);
