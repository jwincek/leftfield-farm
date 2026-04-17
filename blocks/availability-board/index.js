/**
 * Availability Board — editor block (no-build IIFE).
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
	var CheckboxControl = components.CheckboxControl;
	var SelectControl = components.SelectControl;
	var TextControl = components.TextControl;
	var ComboboxControl = components.ComboboxControl;
	var Placeholder = components.Placeholder;
	var Spinner = components.Spinner;
	var useSelect = data.useSelect;

	var ALL_STATUSES = [ 'abundant', 'available', 'limited', 'sold_out', 'unavailable' ];

	var STATUS_LABELS = {
		abundant: 'Abundant',
		available: 'Available',
		limited: 'Limited',
		sold_out: 'Sold out',
		unavailable: 'Unavailable',
	};

	function getRestBase() {
		return ( window.lfufSettings || {} ).restBase || '/wp-json/lfuf/v1';
	}

	function statusLabel( slug ) {
		return STATUS_LABELS[ slug ] || slug;
	}

	/**
	 * Parse the comma-separated defaultStatusFilter into an array.
	 */
	function parseActiveStatuses( str ) {
		return ( str || '' ).split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean );
	}

	registerBlockType( 'lfuf/availability-board', {
		edit: function EditBoard( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var layout = attributes.layout;
			var showFilters = attributes.showFilters;
			var showImages = attributes.showImages;
			var showPrices = attributes.showPrices;
			var showQuantityNotes = attributes.showQuantityNotes;
			var locationId = attributes.locationId;

			// Board data from REST.
			var _board = useState( null );
			var board = _board[0];
			var setBoard = _board[1];

			var _loading = useState( false );
			var loading = _loading[0];
			var setLoading = _loading[1];

			var _error = useState( '' );
			var error = _error[0];
			var setError = _error[1];

			// Fetch board data when locationId changes.
			useEffect( function () {
				setLoading( true );
				setError( '' );
				var url = getRestBase() + '/board';
				if ( locationId ) {
					url += '?location=' + locationId;
				}
				fetch( url )
					.then( function ( r ) {
						if ( ! r.ok ) throw new Error( r.status + ' ' + r.statusText );
						return r.json();
					} )
					.then( function ( data ) {
						setBoard( data );
						setLoading( false );
					} )
					.catch( function () {
						setError( 'Could not load board data.' );
						setBoard( null );
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

			var locationOptions = [
				{ value: 0, label: '\u2014 All locations \u2014' },
			].concat( locations.map( function ( l ) {
				return { value: l.id, label: l.title?.rendered || '(untitled)' };
			} ) );

			var blockProps = useBlockProps( {
				className: 'lfuf-avail-board lfuf-avail-board--' + layout,
			} );

			// Loading state.
			if ( loading ) {
				return el(
					Fragment,
					null,
					renderInspector(),
					el( 'div', blockProps,
						el( 'div', { className: 'lfuf-avail-board__loading' },
							el( Spinner ),
							' Loading availability data\u2026'
						)
					)
				);
			}

			// Error state.
			if ( error || ! board ) {
				return el(
					Fragment,
					null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, {
							icon: 'warning',
							label: 'Availability Board',
							instructions: error || 'Board data unavailable.',
						} )
					)
				);
			}

			// Empty board.
			var groups = board.groups || [];
			var total = board.total_items || 0;

			if ( total === 0 ) {
				return el(
					Fragment,
					null,
					renderInspector(),
					el( 'section', blockProps,
						el( 'p', { className: 'lfuf-avail-board__empty' },
							attributes.emptyMessage
						)
					)
				);
			}

			// Live preview.
			return el(
				Fragment,
				null,
				renderInspector(),
				el( 'section', blockProps,

					// Filter toolbar preview.
					showFilters
						? el( 'div', { className: 'lfuf-avail-board__filters' },
							el( 'div', { className: 'lfuf-avail-board__filter-group', role: 'toolbar' },
								el( 'span', { className: 'lfuf-avail-board__filter-label' }, 'Show:' ),
								( board.statuses || [] ).map( function ( s ) {
									var isActive = parseActiveStatuses( attributes.defaultStatusFilter ).indexOf( s ) !== -1;
									return el( 'span', {
										key: s,
										className: 'lfuf-avail-board__filter-btn lfuf-availability-badge lfuf-availability-badge--' + s +
											( isActive ? ' lfuf-avail-board__filter-btn--active' : '' ),
									}, statusLabel( s ) );
								} )
							),
							( board.filter_types || [] ).length > 1
								? el( 'div', { className: 'lfuf-avail-board__filter-group', role: 'toolbar' },
									el( 'span', { className: 'lfuf-avail-board__filter-label' }, 'Type:' ),
									el( 'span', {
										className: 'lfuf-avail-board__filter-btn lfuf-avail-board__filter-btn--active',
									}, 'All' ),
									( board.filter_types || [] ).map( function ( ft ) {
										return el( 'span', {
											key: ft.slug,
											className: 'lfuf-avail-board__filter-btn',
										}, ft.label );
									} )
								)
								: null
						)
						: null,

					// Groups.
					groups.map( function ( group ) {
						return el( 'div', {
							key: group.slug,
							className: 'lfuf-avail-board__group',
						},
							el( 'h3', { className: 'lfuf-avail-board__group-title' },
								group.label,
								el( 'span', { className: 'lfuf-avail-board__group-count' },
									group.items.length
								)
							),
							el( 'div', {
								className: 'lfuf-avail-board__items lfuf-avail-board__items--' + layout,
							},
								group.items.map( function ( item ) {
									return el( 'article', {
										key: item.availability_id || item.product_id,
										className: 'lfuf-avail-board__item',
									},
										// Thumbnail.
										( showImages && item.thumbnail_url )
											? el( 'div', { className: 'lfuf-avail-board__item-image' },
												el( 'img', {
													src: item.thumbnail_url,
													alt: '',
													loading: 'lazy',
													width: 80,
													height: 80,
												} )
											)
											: null,
										// Body.
										el( 'div', { className: 'lfuf-avail-board__item-body' },
											el( 'div', { className: 'lfuf-avail-board__item-header' },
												el( 'span', { className: 'lfuf-avail-board__item-name' },
													item.product_name
												),
												el( 'span', {
													className: 'lfuf-availability-badge lfuf-availability-badge--' + item.status,
												}, statusLabel( item.status ) )
											),
											( showPrices && item.price )
												? el( 'span', { className: 'lfuf-avail-board__item-price' },
													item.price,
													item.unit
														? el( 'span', { className: 'lfuf-avail-board__item-unit' }, ' / ' + item.unit )
														: null
												)
												: null,
											( showQuantityNotes && item.quantity_note )
												? el( 'span', { className: 'lfuf-avail-board__item-note' },
													item.quantity_note
												)
												: null,
											item.seasons && item.seasons.length
												? el( 'div', { className: 'lfuf-avail-board__item-seasons' },
													item.seasons.map( function ( s ) {
														return el( 'span', {
															key: s,
															className: 'lfuf-avail-board__season-tag',
														}, s );
													} )
												)
												: null
										)
									);
								} )
							)
						);
					} ),

					// Footer.
					el( 'p', { className: 'lfuf-avail-board__footer' },
						'Showing ' + total + ' items',
						board.generated_at
							? el( 'span', { className: 'lfuf-avail-board__timestamp' },
								new Date( board.generated_at ).toLocaleString( undefined, {
									month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
								} )
							)
							: null
					)
				)
			);

			/**
			 * Sidebar inspector — shared across all render branches.
			 */
			function renderInspector() {
				var activeDefaults = parseActiveStatuses( attributes.defaultStatusFilter );

				return el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Board Settings', initialOpen: true },
						el( SelectControl, {
							label: 'Layout',
							value: layout,
							options: [
								{ label: 'Grid', value: 'grid' },
								{ label: 'List', value: 'list' },
							],
							onChange: function ( val ) { setAttributes( { layout: val } ); },
						} ),
						el( ComboboxControl, {
							label: 'Location filter',
							value: locationId || '',
							options: locationOptions,
							onChange: function ( val ) {
								setAttributes( { locationId: val ? Number( val ) : 0 } );
							},
						} ),
						el( TextControl, {
							label: 'Empty state message',
							value: attributes.emptyMessage,
							onChange: function ( val ) { setAttributes( { emptyMessage: val } ); },
						} )
					),
					el(
						PanelBody,
						{ title: 'Default Visibility', initialOpen: true },
						ALL_STATUSES.map( function ( status ) {
							return el( CheckboxControl, {
								key: status,
								label: statusLabel( status ),
								checked: activeDefaults.indexOf( status ) !== -1,
								onChange: function ( checked ) {
									var list = parseActiveStatuses( attributes.defaultStatusFilter );
									if ( checked ) {
										if ( list.indexOf( status ) === -1 ) list.push( status );
									} else {
										list = list.filter( function ( s ) { return s !== status; } );
									}
									setAttributes( { defaultStatusFilter: list.join( ',' ) } );
								},
							} );
						} )
					),
					el(
						PanelBody,
						{ title: 'Display Options', initialOpen: false },
						el( ToggleControl, {
							label: 'Show filter controls',
							checked: showFilters,
							onChange: function ( val ) { setAttributes( { showFilters: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show product images',
							checked: showImages,
							onChange: function ( val ) { setAttributes( { showImages: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show prices',
							checked: showPrices,
							onChange: function ( val ) { setAttributes( { showPrices: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show quantity notes',
							checked: showQuantityNotes,
							onChange: function ( val ) { setAttributes( { showQuantityNotes: val } ); },
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
