/**
 * Event Card — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components, data ) {
	'use strict';

	var el = element.createElement;
	var registerBlockType = blocks.registerBlockType;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var ToggleControl = components.ToggleControl;
	var ComboboxControl = components.ComboboxControl;
	var Placeholder = components.Placeholder;
	var useSelect = data.useSelect;

	registerBlockType( 'lfuf/event-card', {
		edit: function EditEventCard( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var eventId = attributes.eventId;
			var blockProps = useBlockProps( { className: 'lfuf-event-card-editor' } );

			var events = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_event', {
					per_page: 100,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var event = useSelect( function ( select ) {
				if ( ! eventId ) return null;
				return select( 'core' ).getEntityRecord( 'postType', 'lfuf_event', eventId );
			}, [ eventId ] );

			var options = events.map( function ( e ) {
				return { value: e.id, label: e.title?.rendered || '(untitled)' };
			} );

			return el(
				element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Event Settings', initialOpen: true },
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
							checked: attributes.showImage,
							onChange: function ( val ) { setAttributes( { showImage: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show RSVP form',
							checked: attributes.showRsvp,
							onChange: function ( val ) { setAttributes( { showRsvp: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show location',
							checked: attributes.showLocation,
							onChange: function ( val ) { setAttributes( { showLocation: val } ); },
						} )
					)
				),
				el(
					'div',
					blockProps,
					! eventId
						? el( Placeholder, {
							icon: 'calendar',
							label: 'Event Card',
							instructions: 'Select an event from the sidebar.',
						} )
						: el(
							'div',
							{ className: 'lfuf-event-card-editor__preview' },
							el( 'strong', null, event?.title?.rendered || 'Loading…' ),
							el( 'p', { style: { fontSize: '0.8rem', opacity: 0.6, margin: '0.25rem 0 0' } },
								'Event ID: ' + eventId
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
