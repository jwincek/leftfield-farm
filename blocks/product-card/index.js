/**
 * Product Card — editor block (no-build IIFE).
 *
 * Registers lfuf/product-card with a product selector
 * and toggle controls for availability / source display.
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
	var Spinner = components.Spinner;
	var Placeholder = components.Placeholder;
	var useSelect = data.useSelect;

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

	registerBlockType( 'lfuf/product-card', {
		edit: function EditProductCard( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var productId = attributes.productId;
			var showAvailability = attributes.showAvailability;
			var showSource = attributes.showSource;

			// Product data from REST.
			var _product = useState( null );
			var product = _product[0];
			var setProduct = _product[1];

			// Availability from board endpoint.
			var _avail = useState( null );
			var avail = _avail[0];
			var setAvail = _avail[1];

			// Source posts.
			var _sources = useState( [] );
			var sources = _sources[0];
			var setSources = _sources[1];

			var _loading = useState( false );
			var loading = _loading[0];
			var setLoading = _loading[1];

			var _error = useState( '' );
			var error = _error[0];
			var setError = _error[1];

			// Fetch product + availability when productId changes.
			useEffect( function () {
				if ( ! productId ) {
					setProduct( null );
					setAvail( null );
					setSources( [] );
					return;
				}
				setLoading( true );
				setError( '' );

				var productFetch = fetch(
					getRestBase() + '/products/' + productId + '?_embed'
				).then( function ( r ) {
					if ( ! r.ok ) throw new Error( r.status );
					return r.json();
				} );

				var boardFetch = fetch( getRestBase() + '/board' )
					.then( function ( r ) { return r.json(); } )
					.catch( function () { return { groups: [] }; } );

				Promise.all( [ productFetch, boardFetch ] )
					.then( function ( results ) {
						var prod = results[0];
						setProduct( prod );

						// Find this product's availability in board data.
						var match = null;
						( results[1].groups || [] ).forEach( function ( g ) {
							g.items.forEach( function ( item ) {
								if ( item.product_id === productId ) {
									match = item;
								}
							} );
						} );
						setAvail( match );

						// Fetch sources if the product has source IDs.
						var sourceIds = ( prod.meta || {} )._lfuf_source_ids;
						if ( sourceIds && sourceIds.length ) {
							var sourcePromises = sourceIds.map( function ( sid ) {
								return fetch( getRestBase() + '/sources/' + sid + '?_fields=id,title,meta' )
									.then( function ( r ) { return r.ok ? r.json() : null; } )
									.catch( function () { return null; } );
							} );
							Promise.all( sourcePromises ).then( function ( srcResults ) {
								setSources( srcResults.filter( Boolean ) );
								setLoading( false );
							} );
						} else {
							setSources( [] );
							setLoading( false );
						}
					} )
					.catch( function () {
						setError( 'Could not load product data.' );
						setProduct( null );
						setLoading( false );
					} );
			}, [ productId ] );

			// Product list for the picker.
			var products = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_product', {
					per_page: 100,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var options = products.map( function ( p ) {
				return { value: p.id, label: p.title?.rendered || p.title?.raw || '(untitled)' };
			} );

			var blockProps = useBlockProps( { className: 'lfuf-product-card' } );

			// Extract display data from product response.
			var title = product ? ( product.title?.rendered || '' ) : '';
			var meta = product ? ( product.meta || {} ) : {};
			var price = meta._lfuf_price || '';
			var unit = meta._lfuf_unit || '';
			var growingNotes = meta._lfuf_growing_notes || '';

			// Thumbnail from _embedded.
			var thumbnailUrl = '';
			if ( product && product._embedded && product._embedded['wp:featuredmedia'] ) {
				var fm = product._embedded['wp:featuredmedia'][0];
				if ( fm ) {
					thumbnailUrl = ( fm.media_details && fm.media_details.sizes && fm.media_details.sizes.medium )
						? fm.media_details.sizes.medium.source_url
						: fm.source_url || '';
				}
			}

			// Taxonomy terms from _embedded.
			var productTypes = [];
			var seasons = [];
			if ( product && product._embedded && product._embedded['wp:term'] ) {
				product._embedded['wp:term'].forEach( function ( termGroup ) {
					if ( ! Array.isArray( termGroup ) ) return;
					termGroup.forEach( function ( term ) {
						if ( term.taxonomy === 'lfuf_product_type' ) {
							productTypes.push( term.name );
						} else if ( term.taxonomy === 'lfuf_season' ) {
							seasons.push( term.name );
						}
					} );
				} );
			}

			// No product selected — placeholder with inline picker.
			if ( ! productId ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, { icon: 'carrot', label: 'Product Card' },
							el( ComboboxControl, {
								label: 'Select a product',
								value: '',
								options: options,
								onChange: function ( val ) {
									setAttributes( { productId: val ? Number( val ) : 0 } );
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
						el( 'div', { className: 'lfuf-product-card__loading' },
							el( Spinner ), ' Loading product\u2026'
						)
					)
				);
			}

			// Error.
			if ( error || ! product ) {
				return el( Fragment, null,
					renderInspector(),
					el( 'div', blockProps,
						el( Placeholder, {
							icon: 'warning',
							label: 'Product Card',
							instructions: error || 'Product data unavailable.',
						} )
					)
				);
			}

			// Live preview — mirrors render.php structure.
			return el( Fragment, null,
				renderInspector(),
				el( 'article', blockProps,

					// Thumbnail.
					thumbnailUrl
						? el( 'div', { className: 'lfuf-product-card__image' },
							el( 'img', { src: thumbnailUrl, alt: '', loading: 'lazy' } )
						)
						: null,

					// Body.
					el( 'div', { className: 'lfuf-product-card__body' },

						// Title.
						el( 'h3', { className: 'lfuf-product-card__title' },
							el( 'span', null, title )
						),

						// Product type.
						productTypes.length
							? el( 'span', { className: 'lfuf-product-card__type' },
								productTypes.join( ', ' )
							)
							: null,

						// Price.
						price
							? el( 'span', { className: 'lfuf-product-card__price' },
								price,
								unit
									? el( 'span', { className: 'lfuf-product-card__unit' }, ' / ' + unit )
									: null
							)
							: null,

						// Seasons.
						seasons.length
							? el( 'div', { className: 'lfuf-product-card__seasons' },
								seasons.map( function ( s ) {
									return el( 'span', {
										key: s,
										className: 'lfuf-product-card__season-badge',
									}, s );
								} )
							)
							: null,

						// Growing notes.
						growingNotes
							? el( 'p', { className: 'lfuf-product-card__notes' }, growingNotes )
							: null,

						// Availability.
						( showAvailability && avail )
							? el( 'div', { className: 'lfuf-product-card__availability' },
								el( 'span', {
									className: 'lfuf-availability-badge lfuf-availability-badge--' + avail.status,
								}, STATUS_LABELS[ avail.status ] || avail.status ),
								avail.quantity_note
									? el( 'span', { className: 'lfuf-product-card__quantity-note' },
										avail.quantity_note
									)
									: null
							)
							: ( showAvailability && ! avail )
								? el( 'div', { className: 'lfuf-product-card__availability' },
									el( 'span', {
										className: 'lfuf-availability-badge lfuf-availability-badge--unavailable',
									}, 'No availability set' )
								)
								: null,

						// Sources.
						( showSource && sources.length )
							? el( 'div', { className: 'lfuf-product-card__sources' },
								el( 'strong', null, 'Sourced from:' ),
								sources.map( function ( src ) {
									var farmName = ( src.meta && src.meta._lfuf_source_farm_name )
										? src.meta._lfuf_source_farm_name
										: ( src.title?.rendered || src.title?.raw || '' );
									var loc = ( src.meta && src.meta._lfuf_source_location ) || '';
									return el( 'div', {
										key: src.id,
										className: 'lfuf-product-card__source',
									},
										el( 'span', null, farmName ),
										loc
											? el( 'span', { className: 'lfuf-product-card__source-location' },
												' (' + loc + ')'
											)
											: null
									);
								} )
							)
							: null
					)
				)
			);

			function renderInspector() {
				return el( InspectorControls, null,
					el( PanelBody, { title: 'Product Settings', initialOpen: true },
						el( ComboboxControl, {
							label: 'Select Product',
							value: productId || '',
							options: options,
							onChange: function ( val ) {
								setAttributes( { productId: val ? Number( val ) : 0 } );
							},
						} ),
						el( ToggleControl, {
							label: 'Show availability status',
							checked: showAvailability,
							onChange: function ( val ) { setAttributes( { showAvailability: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show source / grain info',
							checked: showSource,
							onChange: function ( val ) { setAttributes( { showSource: val } ); },
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
