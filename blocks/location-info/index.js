/**
 * Location Info — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components, data ) {
	'use strict';

	const el = element.createElement;
	const { registerBlockType } = blocks;
	const { InspectorControls, useBlockProps } = blockEditor;
	const { PanelBody, ComboboxControl, ToggleControl, Placeholder } = components;
	const { useSelect } = data;

	registerBlockType( 'lfuf/location-info', {
		edit: function EditLocationInfo( props ) {
			const { attributes, setAttributes } = props;
			const { locationId, showVenmo, showStatus } = attributes;
			const blockProps = useBlockProps();

			const locations = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_location', {
					per_page: 50,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			const location = useSelect( function ( select ) {
				if ( ! locationId ) return null;
				return select( 'core' ).getEntityRecord( 'postType', 'lfuf_location', locationId );
			}, [ locationId ] );

			const options = locations.map( function ( l ) {
				return { value: l.id, label: l.title?.rendered || '(untitled)' };
			} );

			return el(
				element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Location Settings', initialOpen: true },
						el( ComboboxControl, {
							label: 'Select Location',
							value: locationId || '',
							options: options,
							onChange: function ( val ) {
								setAttributes( { locationId: val ? Number( val ) : 0 } );
							},
						} ),
						el( ToggleControl, {
							label: 'Show open/closed status',
							checked: showStatus,
							onChange: function ( val ) {
								setAttributes( { showStatus: val } );
							},
						} ),
						el( ToggleControl, {
							label: 'Show Venmo link',
							checked: showVenmo,
							onChange: function ( val ) {
								setAttributes( { showVenmo: val } );
							},
						} )
					)
				),
				el(
					'div',
					blockProps,
					! locationId
						? el( Placeholder, {
							icon: 'store',
							label: 'Location Info',
							instructions: 'Select a location from the sidebar.',
						} )
						: el(
							'div',
							{ className: 'lfuf-location-info__preview' },
							el( 'h3', null, location?.title?.rendered || 'Loading…' ),
							el( 'p', { style: { opacity: 0.6 } },
								'ID: ' + locationId +
								( showStatus ? ' · Status shown' : '' ) +
								( showVenmo ? ' · Venmo shown' : '' )
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
