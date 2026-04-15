/**
 * Stand Status Banner — editor block (no-build IIFE).
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
	var ComboboxControl = components.ComboboxControl;
	var Placeholder = components.Placeholder;
	var useSelect = data.useSelect;

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
			var blockProps = useBlockProps( {
				className: 'lfuf-stand-banner lfuf-stand-banner--' + layout,
			} );

			var locations = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_location', {
					per_page: 50,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var location = useSelect( function ( select ) {
				if ( ! locationId ) return null;
				return select( 'core' ).getEntityRecord( 'postType', 'lfuf_location', locationId );
			}, [ locationId ] );

			var options = locations.map( function ( l ) {
				return { value: l.id, label: l.title?.rendered || '(untitled)' };
			} );

			return el(
				Fragment,
				null,
				el(
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
				),
				el(
					'div',
					blockProps,
					! locationId
						? el( Placeholder, {
							icon: 'store',
							label: 'Stand Status Banner',
							instructions: 'Select a location in the sidebar to preview the stand banner.',
						} )
						: el(
							'div',
							{ className: 'lfuf-stand-banner__preview' },
							el(
								'div',
								{ className: 'lfuf-stand-banner__status-row' },
								el( 'span', { className: 'lfuf-stand-banner__indicator lfuf-stand-banner__indicator--closed' } ),
								el( 'span', { className: 'lfuf-stand-banner__status-label' }, 'Closed' ),
								el( 'span', { className: 'lfuf-stand-banner__name' },
									location?.title?.rendered || 'Loading…'
								)
							),
							el( 'p', { className: 'lfuf-stand-banner__editor-hint' },
								'Layout: ' + layout +
								( showAddress ? ' · Address' : '' ) +
								( showHours ? ' · Hours' : '' ) +
								( showVenmo ? ' · Venmo' : '' ) +
								( pollingEnabled ? ' · Live polling' : '' )
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
	window.wp.data
);
