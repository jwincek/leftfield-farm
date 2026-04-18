/**
 * Event Card — editor block (no-build IIFE).
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
	var ComboboxControl = components.ComboboxControl;
	var Placeholder = components.Placeholder;
	var Spinner = components.Spinner;
	var useSelect = data.useSelect;

	function getRestBase() {
		return ( window.lfufSettings || {} ).restBase || '/wp-json/lfuf/v1';
	}

	/**
	 * Format an ISO datetime for display.
	 */
	function formatEventDate( start, end ) {
		if ( ! start ) return {};
		var s = new Date( start );
		if ( isNaN( s ) ) return {};
		var dateStr = s.toLocaleDateString( undefined, {
			weekday: 'long', month: 'long', day: 'numeric',
		} );
		var timeStr = s.toLocaleTimeString( undefined, {
			hour: 'numeric', minute: '2-digit',
		} );
		if ( end ) {
			var e = new Date( end );
			if ( ! isNaN( e ) ) {
				timeStr += ' \u2013 ' + e.toLocaleTimeString( undefined, {
					hour: 'numeric', minute: '2-digit',
				} );
			}
		}
		return { date: dateStr, time: timeStr };
	}

	registerBlockType( 'lfuf/event-card', {
		edit: function EditEventCard( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var eventId = attributes.eventId;
			var showImage = attributes.showImage;
			var showRsvp = attributes.showRsvp;
			var showLocation = attributes.showLocation;

			// Event data from REST.
			var _ev = useState( null );
			var ev = _ev[0];
			var setEv = _ev[1];

			var _loading = useState( false );
			var loading = _loading[0];
			var setLoading = _loading[1];

			var _error = useState( '' );
			var error = _error[0];
			var setError = _error[1];

			// Fetch event data — search both upcoming and past.
			useEffect( function () {
				if ( ! eventId ) {
					setEv( null );
					return;
				}
				setLoading( true );
				setError( '' );

				Promise.all( [
					fetch( getRestBase() + '/events/upcoming?per_page=50' )
						.then( function ( r ) { return r.ok ? r.json() : []; } )
						.catch( function () { return []; } ),
					fetch( getRestBase() + '/events/past?per_page=50' )
						.then( function ( r ) { return r.ok ? r.json() : []; } )
						.catch( function () { return []; } ),
				] ).then( function ( results ) {
					var all = results[0].concat( results[1] );
					var match = null;
					for ( var i = 0; i < all.length; i++ ) {
						if ( all[i].id === eventId ) {
							match = all[i];
							break;
						}
					}
					setEv( match );
					if ( ! match ) {
						setError( 'Event not found. It may be unpublished or not yet scheduled.' );
					}
					setLoading( false );
				} );
			}, [ eventId ] );

			// Event list for the picker.
			var events = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_event', {
					per_page: 100,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var options = events.map( function ( e ) {
				return { value: e.id, label: e.title?.rendered || '(untitled)' };
			} );

			var blockProps = useBlockProps( { className: 'lfuf-event-card-wrapper' } );

			// No event selected — placeholder with inline picker.
			if ( ! eventId ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, { icon: 'calendar', label: 'Event Card' },
							el( ComboboxControl, {
								label: 'Select an event',
								value: '',
								options: options,
								onChange: function ( val ) {
									setAttributes( { eventId: val ? Number( val ) : 0 } );
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
						el( 'div', { className: 'lfuf-event-card-wrapper__loading' },
							el( Spinner ), ' Loading event\u2026'
						)
					)
				);
			}

			// Error.
			if ( error || ! ev ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, {
							icon: 'warning',
							label: 'Event Card',
							instructions: error || 'Event data unavailable.',
						} )
					)
				);
			}

			// Live preview — mirrors render_event_card() structure.
			var dt = formatEventDate( ev.start, ev.end );
			var rsvp = ev.rsvp;

			return el( Fragment, null,
				renderInspector(),
				el( 'div', blockProps,
					el( 'article', {
						className: 'lfuf-event-card' + ( ev.cancelled ? ' lfuf-event-card--cancelled' : '' ),
					},
						// Image.
						( showImage && ev.thumbnail_url )
							? el( 'div', { className: 'lfuf-event-card__image' },
								el( 'img', { src: ev.thumbnail_url, alt: '', loading: 'lazy' } )
							)
							: null,

						// Body.
						el( 'div', { className: 'lfuf-event-card__body' },

							// Header.
							el( 'div', { className: 'lfuf-event-card__header' },
								( ev.event_types && ev.event_types[0] )
									? el( 'span', { className: 'lfuf-event-card__type-badge' },
										ev.event_types[0]
									)
									: null,
								ev.cancelled
									? el( 'span', { className: 'lfuf-event-card__cancelled-badge' }, 'Cancelled' )
									: null
							),

							// Title.
							el( 'h3', { className: 'lfuf-event-card__title' },
								el( 'span', null, ev.title )
							),

							// Date & time.
							dt.date
								? el( 'p', { className: 'lfuf-event-card__datetime' },
									el( 'span', { className: 'lfuf-event-card__date' }, dt.date ),
									dt.time
										? el( 'span', { className: 'lfuf-event-card__time' }, dt.time )
										: null
								)
								: null,

							// Location.
							( showLocation && ev.location )
								? el( 'p', { className: 'lfuf-event-card__location' },
									'\uD83D\uDCCD ',
									ev.location.title,
									ev.location.address
										? el( 'span', { className: 'lfuf-event-card__address' },
											' \u2014 ' + ev.location.address
										)
										: null
								)
								: null,

							// Excerpt.
							ev.excerpt
								? el( 'p', { className: 'lfuf-event-card__excerpt' }, ev.excerpt )
								: null,

							// Details.
							( ev.cost_note || ev.what_to_bring )
								? el( 'div', { className: 'lfuf-event-card__details' },
									ev.cost_note
										? el( 'span', { className: 'lfuf-event-card__cost' },
											'\uD83D\uDCB8 ' + ev.cost_note
										)
										: null,
									ev.what_to_bring
										? el( 'span', { className: 'lfuf-event-card__bring' },
											'\uD83E\uDDFA ' + ev.what_to_bring
										)
										: null
								)
								: null,

							// RSVP summary (preview only — form is disabled in editor).
							( showRsvp && rsvp && rsvp.enabled && ! ev.cancelled )
								? el( 'div', { className: 'lfuf-event-card__rsvp' },
									el( 'div', { className: 'lfuf-event-card__rsvp-summary' },
										rsvp.headcount + ' people coming' +
										( rsvp.spots_left !== null ? ' \u00b7 ' + rsvp.spots_left + ' spots left' : '' )
									),
									rsvp.is_full
										? el( 'p', { className: 'lfuf-event-card__rsvp-full' }, 'This event is full!' )
										: rsvp.closed
											? el( 'p', { className: 'lfuf-event-card__rsvp-closed' }, 'RSVPs are closed.' )
											: el( 'div', { className: 'lfuf-event-card__rsvp-form' },
												el( 'input', {
													type: 'text',
													className: 'lfuf-event-card__rsvp-input',
													placeholder: 'Your name',
													disabled: true,
												} ),
												el( 'input', {
													type: 'number',
													className: 'lfuf-event-card__rsvp-size',
													value: 1,
													disabled: true,
												} ),
												el( 'button', {
													type: 'button',
													className: 'lfuf-event-card__rsvp-btn',
													disabled: true,
												}, "I'm coming!" )
											)
								)
								: null
						)
					)
				)
			);

			function renderInspector() {
				return el( InspectorControls, null,
					el( PanelBody, { title: 'Event Settings', initialOpen: true },
						el( ComboboxControl, {
							label: 'Select Event',
							value: eventId || '',
							options: options,
							onChange: function ( val ) {
								setAttributes( { eventId: val ? Number( val ) : 0 } );
							},
						} ),
						el( ToggleControl, {
							label: 'Show image',
							checked: showImage,
							onChange: function ( val ) { setAttributes( { showImage: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show RSVP form',
							checked: showRsvp,
							onChange: function ( val ) { setAttributes( { showRsvp: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show location',
							checked: showLocation,
							onChange: function ( val ) { setAttributes( { showLocation: val } ); },
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
