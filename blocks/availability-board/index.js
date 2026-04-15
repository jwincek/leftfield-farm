/**
 * Availability Board — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components, data ) {
	'use strict';

	var el = element.createElement;
	var Fragment = element.Fragment;
	var registerBlockType = blocks.registerBlockType;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var ToggleControl = components.ToggleControl;
	var SelectControl = components.SelectControl;
	var TextControl = components.TextControl;
	var ComboboxControl = components.ComboboxControl;
	var Placeholder = components.Placeholder;
	var useSelect = data.useSelect;

	registerBlockType( 'lfuf/availability-board', {
		edit: function EditBoard( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var blockProps = useBlockProps( {
				className: 'lfuf-avail-board lfuf-avail-board--' + attributes.layout,
			} );

			var locations = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_location', {
					per_page: 50,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var locationOptions = [
				{ value: 0, label: '— All locations —' },
			].concat( locations.map( function ( l ) {
				return { value: l.id, label: l.title?.rendered || '(untitled)' };
			} ) );

			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Board Settings', initialOpen: true },
						el( SelectControl, {
							label: 'Layout',
							value: attributes.layout,
							options: [
								{ label: 'Grid', value: 'grid' },
								{ label: 'List', value: 'list' },
							],
							onChange: function ( val ) { setAttributes( { layout: val } ); },
						} ),
						el( ComboboxControl, {
							label: 'Location filter',
							value: attributes.locationId || '',
							options: locationOptions,
							onChange: function ( val ) {
								setAttributes( { locationId: val ? Number( val ) : 0 } );
							},
						} ),
						el( TextControl, {
							label: 'Default status filter',
							value: attributes.defaultStatusFilter,
							onChange: function ( val ) { setAttributes( { defaultStatusFilter: val } ); },
							help: 'Comma-separated: abundant,available,limited,sold_out,unavailable',
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
							label: 'Show filter controls',
							checked: attributes.showFilters,
							onChange: function ( val ) { setAttributes( { showFilters: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show product images',
							checked: attributes.showImages,
							onChange: function ( val ) { setAttributes( { showImages: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show prices',
							checked: attributes.showPrices,
							onChange: function ( val ) { setAttributes( { showPrices: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show quantity notes',
							checked: attributes.showQuantityNotes,
							onChange: function ( val ) { setAttributes( { showQuantityNotes: val } ); },
						} )
					)
				),
				el(
					'div',
					blockProps,
					el( Placeholder, {
						icon: 'grid-view',
						label: 'Availability Board',
						instructions: 'The board renders on the front end using the Interactivity API. It will display all products with current availability status, grouped by product type.' +
							( attributes.showFilters ? ' Filter controls will be shown.' : '' ),
					} )
				)
			);
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.data
);
