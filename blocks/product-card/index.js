/**
 * Product Card — editor block (no-build IIFE).
 *
 * Registers lfuf/product-card with a product selector
 * and toggle controls for availability / source display.
 */
( function ( blocks, element, blockEditor, components, data, compose ) {
	'use strict';

	const el          = element.createElement;
	const { Fragment } = element;
	const { registerBlockType } = blocks;
	const { InspectorControls, useBlockProps } = blockEditor;
	const { PanelBody, ToggleControl, ComboboxControl, Spinner, Placeholder } = components;
	const { useSelect } = data;

	registerBlockType( 'lfuf/product-card', {
		edit: function EditProductCard( props ) {
			const { attributes, setAttributes } = props;
			const { productId, showAvailability, showSource } = attributes;
			const blockProps = useBlockProps();

			// Fetch all published products for the selector.
			const { products, isLoading } = useSelect( function ( select ) {
				const query = {
					per_page: 100,
					status: 'publish',
					_fields: 'id,title',
				};
				return {
					products: select( 'core' ).getEntityRecords( 'postType', 'lfuf_product', query ) || [],
					isLoading: select( 'core/data' ).isResolving( 'core', 'getEntityRecords', [ 'postType', 'lfuf_product', query ] ),
				};
			}, [] );

			// Fetch the selected product.
			const product = useSelect( function ( select ) {
				if ( ! productId ) return null;
				return select( 'core' ).getEntityRecord( 'postType', 'lfuf_product', productId );
			}, [ productId ] );

			const options = products.map( function ( p ) {
				return {
					value: p.id,
					label: p.title?.rendered || p.title?.raw || '(untitled)',
				};
			} );

			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Product Settings', initialOpen: true },
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
							onChange: function ( val ) {
								setAttributes( { showAvailability: val } );
							},
						} ),
						el( ToggleControl, {
							label: 'Show source / grain info',
							checked: showSource,
							onChange: function ( val ) {
								setAttributes( { showSource: val } );
							},
						} )
					)
				),
				el(
					'div',
					blockProps,
					! productId
						? el( Placeholder, {
							icon: 'carrot',
							label: 'Product Card',
							instructions: 'Select a product from the sidebar.',
						} )
						: isLoading
							? el( Spinner )
							: el(
								'div',
								{ className: 'lfuf-product-card__preview' },
								el( 'h3', { className: 'lfuf-product-card__title' },
									product?.title?.rendered || 'Loading…'
								),
								el( 'p', { className: 'lfuf-product-card__meta' },
									'ID: ' + productId +
									( showAvailability ? ' · Availability shown' : '' ) +
									( showSource ? ' · Source shown' : '' )
								)
							)
				)
			);
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.data,
	window.wp.compose
);
