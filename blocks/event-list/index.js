/**
 * Event List — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components ) {
	'use strict';

	var el = element.createElement;
	var registerBlockType = blocks.registerBlockType;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var ToggleControl = components.ToggleControl;
	var RangeControl = components.RangeControl;
	var TextControl = components.TextControl;
	var Placeholder = components.Placeholder;

	registerBlockType( 'lfuf/event-list', {
		edit: function EditEventList( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var blockProps = useBlockProps( { className: 'lfuf-event-list' } );

			return el(
				element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Event List Settings', initialOpen: true },
						el( RangeControl, {
							label: 'Events to show',
							value: attributes.perPage,
							onChange: function ( val ) { setAttributes( { perPage: val } ); },
							min: 1,
							max: 50,
						} ),
						el( ToggleControl, {
							label: 'Show past events',
							checked: attributes.showPastEvents,
							onChange: function ( val ) { setAttributes( { showPastEvents: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show event type filters',
							checked: attributes.showTypeFilters,
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
							checked: attributes.showImages,
							onChange: function ( val ) { setAttributes( { showImages: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show RSVP forms',
							checked: attributes.showRsvp,
							onChange: function ( val ) { setAttributes( { showRsvp: val } ); },
						} ),
						el( ToggleControl, {
							label: 'Show location details',
							checked: attributes.showLocation,
							onChange: function ( val ) { setAttributes( { showLocation: val } ); },
						} )
					)
				),
				el(
					'div',
					blockProps,
					el( Placeholder, {
						icon: 'calendar-alt',
						label: 'Event List',
						instructions: 'Upcoming events will render on the front end with RSVP forms and filtering via the Interactivity API.' +
							( attributes.showPastEvents ? ' Past events will also be shown.' : '' ),
					} )
				)
			);
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components
);
