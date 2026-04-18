/**
 * Stand Hours Schedule — editor block (no-build IIFE).
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
	var ComboboxControl = components.ComboboxControl;
	var ToggleControl = components.ToggleControl;
	var Placeholder = components.Placeholder;
	var Spinner = components.Spinner;
	var useSelect = data.useSelect;

	var DAY_NAMES = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

	function getRestBase() {
		return ( window.lfufStandSettings || window.lfufSettings || {} ).restBase || '/wp-json/lfuf/v1';
	}

	/**
	 * Format a time string like "14:00" to "2:00 PM".
	 */
	function formatTime( timeStr ) {
		if ( ! timeStr ) return '';
		var parts = timeStr.split( ':' );
		var h = parseInt( parts[0], 10 );
		var m = parts[1] || '00';
		var ampm = h >= 12 ? 'PM' : 'AM';
		h = h % 12 || 12;
		return h + ':' + m + ' ' + ampm;
	}

	/**
	 * Parse schedule array into a map of day index → time strings.
	 */
	function buildScheduleByDay( schedule ) {
		var byDay = {};
		if ( ! Array.isArray( schedule ) ) return byDay;
		schedule.forEach( function ( entry ) {
			var day = parseInt( entry.day, 10 );
			if ( day >= 0 && day <= 6 ) {
				if ( ! byDay[ day ] ) byDay[ day ] = [];
				var open = formatTime( entry.open || '00:00' );
				var close = formatTime( entry.close || '23:59' );
				byDay[ day ].push( open + ' \u2013 ' + close );
			}
		} );
		return byDay;
	}

	registerBlockType( 'lfuf/stand-hours-schedule', {
		edit: function EditSchedule( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var locationId = attributes.locationId;
			var highlightToday = attributes.highlightToday;

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
					.catch( function () {
						setError( 'Could not load schedule data.' );
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

			var blockProps = useBlockProps( { className: 'lfuf-stand-schedule' } );
			var today = new Date().getDay();

			// No location selected — placeholder with inline picker.
			if ( ! locationId ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, { icon: 'clock', label: 'Stand Hours Schedule' },
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

			// Loading.
			if ( loading ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( 'div', { className: 'lfuf-stand-schedule__loading' },
							el( Spinner ), ' Loading schedule\u2026'
						)
					)
				);
			}

			// Error.
			if ( error || ! stand ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, {
							icon: 'warning',
							label: 'Stand Hours Schedule',
							instructions: error || 'Schedule data unavailable.',
						} )
					)
				);
			}

			// Parse schedule.
			var byDay = buildScheduleByDay( stand.schedule );
			var hasSchedule = Object.keys( byDay ).length > 0;

			// No schedule — show fallback or empty message.
			if ( ! hasSchedule ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'section', blockProps,
						stand.hours
							? el( 'p', { className: 'lfuf-stand-schedule__fallback' },
								'\uD83D\uDD50 ' + stand.hours
							)
							: el( 'p', { className: 'lfuf-stand-schedule__empty' },
								'No schedule set yet.'
							)
					)
				);
			}

			// Live preview — table structure matching render.php.
			return el( Fragment, null,
				renderInspector(),
				el( 'section', blockProps,
					el( 'table', { className: 'lfuf-stand-schedule__table', role: 'table' },
						el( 'tbody', null,
							DAY_NAMES.map( function ( dayName, d ) {
								var isToday = highlightToday && d === today;
								var hasHours = !! byDay[ d ];
								var classes = 'lfuf-stand-schedule__day';
								if ( isToday ) classes += ' lfuf-stand-schedule__day--today';
								if ( ! hasHours ) classes += ' lfuf-stand-schedule__day--closed';

								return el( 'tr', {
									key: d,
									className: classes,
								},
									el( 'th', {
										scope: 'row',
										className: 'lfuf-stand-schedule__day-label',
									},
										dayName,
										isToday
											? el( 'span', { className: 'lfuf-stand-schedule__today-badge' }, 'Today' )
											: null
									),
									el( 'td', { className: 'lfuf-stand-schedule__day-hours' },
										hasHours ? byDay[ d ].join( ', ' ) : 'Closed'
									)
								);
							} )
						)
					)
				)
			);

			function renderInspector() {
				return el( InspectorControls, null,
					el( PanelBody, { title: 'Schedule Settings', initialOpen: true },
						el( ComboboxControl, {
							label: 'Location',
							value: locationId || '',
							options: options,
							onChange: function ( val ) {
								setAttributes( { locationId: val ? Number( val ) : 0 } );
							},
						} ),
						el( ToggleControl, {
							label: 'Highlight today',
							checked: highlightToday,
							onChange: function ( val ) { setAttributes( { highlightToday: val } ); },
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
