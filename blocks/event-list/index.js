/**
 * Event List — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components ) {
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
	var RangeControl = components.RangeControl;
	var TextControl = components.TextControl;
	var Placeholder = components.Placeholder;
	var Spinner = components.Spinner;

	function getRestBase() {
		return ( window.lfufSettings || {} ).restBase || '/wp-json/lfuf/v1';
	}

	/**
	 * Format an ISO datetime as "Saturday, April 12" / "2:00 PM – 5:00 PM".
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

	registerBlockType( 'lfuf/event-list', {
		edit: function EditEventList( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var showPastEvents = attributes.showPastEvents;
			var perPage = attributes.perPage;
			var showImages = attributes.showImages;
			var showRsvp = attributes.showRsvp;
			var showLocation = attributes.showLocation;
			var showTypeFilters = attributes.showTypeFilters;

			// Event data from REST.
			var _upcoming = useState( null );
			var upcoming = _upcoming[0];
			var setUpcoming = _upcoming[1];

			var _past = useState( null );
			var past = _past[0];
			var setPast = _past[1];

			var _loading = useState( false );
			var loading = _loading[0];
			var setLoading = _loading[1];

			var _error = useState( '' );
			var error = _error[0];
			var setError = _error[1];

			// Fetch upcoming events (and past if enabled).
			useEffect( function () {
				setLoading( true );
				setError( '' );
				var fetches = [
					fetch( getRestBase() + '/events/upcoming?per_page=' + perPage )
						.then( function ( r ) {
							if ( ! r.ok ) throw new Error( r.status );
							return r.json();
						} ),
				];
				if ( showPastEvents ) {
					fetches.push(
						fetch( getRestBase() + '/events/past?per_page=' + perPage )
							.then( function ( r ) {
								if ( ! r.ok ) throw new Error( r.status );
								return r.json();
							} )
					);
				}
				Promise.all( fetches )
					.then( function ( results ) {
						setUpcoming( results[0] || [] );
						setPast( results[1] || [] );
						setLoading( false );
					} )
					.catch( function () {
						setError( 'Could not load event data.' );
						setUpcoming( [] );
						setPast( [] );
						setLoading( false );
					} );
			}, [ perPage, showPastEvents ] );

			var blockProps = useBlockProps( { className: 'lfuf-event-list' } );

			// Loading.
			if ( loading ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( 'div', { className: 'lfuf-event-list__loading' },
							el( Spinner ), ' Loading events\u2026'
						)
					)
				);
			}

			// Error.
			if ( error ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, {
							icon: 'warning',
							label: 'Event List',
							instructions: error,
						} )
					)
				);
			}

			var hasEvents = ( upcoming && upcoming.length > 0 ) || ( past && past.length > 0 );

			// Empty.
			if ( ! hasEvents ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( 'p', { className: 'lfuf-event-list__empty' },
							attributes.emptyMessage
						)
					)
				);
			}

			// Collect unique event types for the filter toolbar preview.
			var typeMap = {};
			( upcoming || [] ).concat( past || [] ).forEach( function ( ev ) {
				if ( ev.event_types && ev.event_types[0] && ev.event_slugs && ev.event_slugs[0] ) {
					typeMap[ ev.event_slugs[0] ] = ev.event_types[0];
				}
			} );
			var typeEntries = Object.keys( typeMap );

			// Live preview.
			return el( Fragment, null,
				renderInspector(),
				el( 'div', blockProps,

					// Type filter toolbar.
					( showTypeFilters && typeEntries.length > 1 )
						? el( 'div', { className: 'lfuf-event-list__filters' },
							el( 'span', {
								className: 'lfuf-event-list__filter-btn lfuf-event-list__filter-btn--active',
							}, 'All Events' ),
							typeEntries.map( function ( slug ) {
								return el( 'span', {
									key: slug,
									className: 'lfuf-event-list__filter-btn',
								}, typeMap[ slug ] );
							} )
						)
						: null,

					// Upcoming section.
					( upcoming && upcoming.length > 0 )
						? renderSection( 'Upcoming', upcoming, false )
						: null,

					// Past section.
					( showPastEvents && past && past.length > 0 )
						? renderSection( 'Past Events', past, true )
						: null
				)
			);

			/**
			 * Render a section of event cards.
			 */
			function renderSection( title, events, isPast ) {
				return el( 'div', {
					className: 'lfuf-event-list__section' + ( isPast ? ' lfuf-event-list__section--past' : '' ),
				},
					el( 'h3', { className: 'lfuf-event-list__section-title' }, title ),
					events.map( function ( ev ) {
						return renderEventCard( ev, isPast );
					} )
				);
			}

			/**
			 * Render a single event card preview.
			 */
			function renderEventCard( ev, isPast ) {
				var dt = formatEventDate( ev.start, ev.end );
				var rsvp = ev.rsvp;

				return el( 'article', {
					key: ev.id,
					className: 'lfuf-event-card' + ( ev.cancelled ? ' lfuf-event-card--cancelled' : '' ),
				},
					// Image.
					( showImages && ev.thumbnail_url )
						? el( 'div', { className: 'lfuf-event-card__image' },
							el( 'img', {
								src: ev.thumbnail_url,
								alt: '',
								loading: 'lazy',
							} )
						)
						: null,

					// Body.
					el( 'div', { className: 'lfuf-event-card__body' },

						// Header (type badge + cancelled badge).
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

						// Details (cost, bring).
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

						// RSVP summary (preview only — no form in editor).
						( showRsvp && ! isPast && rsvp && rsvp.enabled && ! ev.cancelled )
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
				);
			}

			/**
			 * Sidebar inspector — shared across all render branches.
			 */
			function renderInspector() {
				return el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Event List Settings', initialOpen: true },
						el( RangeControl, {
							label: 'Events to show',
							value: perPage,
							onChange: function ( val ) { setAttributes( { perPage: val } ); },
							min: 1,
							max: 50,
						} ),
						el( ToggleControl, {
							label: 'Show past events',
							checked: showPastEvents,
							onChange: function ( val ) { setAttributes( { showPastEvents: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show event type filters',
							checked: showTypeFilters,
							onChange: function ( val ) { setAttributes( { showTypeFilters: val } ); },
						} ),
						el( TextControl, {
							label: 'Empty state message',
							value: attributes.emptyMessage,
							onChange: function ( val ) { setAttributes( { emptyMessage: val } ); },
						} )
					),
					el(
						PanelBody,
						{ title: 'Display Options', initialOpen: false },
						el( ToggleControl, {
							label: 'Show event images',
							checked: showImages,
							onChange: function ( val ) { setAttributes( { showImages: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show RSVP forms',
							checked: showRsvp,
							onChange: function ( val ) { setAttributes( { showRsvp: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show location details',
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
	window.wp.components
);
