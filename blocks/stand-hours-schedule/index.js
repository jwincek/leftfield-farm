/**
 * Stand Hours Schedule — editor block (no-build IIFE).
 */
( function ( blocks, element, blockEditor, components, data ) {
	'use strict';

	var el = element.createElement;
	var registerBlockType = blocks.registerBlockType;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var ComboboxControl = components.ComboboxControl;
	var ToggleControl = components.ToggleControl;
	var Placeholder = components.Placeholder;
	var useSelect = data.useSelect;

	var DAY_NAMES = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];

	registerBlockType( 'lfuf/stand-hours-schedule', {
		edit: function EditSchedule( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var locationId = attributes.locationId;
			var highlightToday = attributes.highlightToday;
			var blockProps = useBlockProps( { className: 'lfuf-stand-schedule' } );

			var locations = useSelect( function ( select ) {
				return select( 'core' ).getEntityRecords( 'postType', 'lfuf_location', {
					per_page: 50,
					status: 'publish',
					_fields: 'id,title',
				} ) || [];
			}, [] );

			var options = locations.map( function ( l ) {
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
						{ title: 'Schedule Settings', initialOpen: true },
						el( ComboboxControl, {
							label: 'Location',
							value: locationId || '',
							options: options,
							onChange: function ( val ) {
								setAttributes( { locationId: val ? Number( val ) : 0 } );
							},
						} ),
						el( ToggleControl, {
							label: 'Highlight today',
							checked: highlightToday,
							onChange: function ( val ) {
								setAttributes( { highlightToday: val } );
							},
						} )
					)
				),
				el(
					'div',
					blockProps,
					! locationId
						? el( Placeholder, {
							icon: 'clock',
							label: 'Stand Hours Schedule',
							instructions: 'Select a location in the sidebar.',
						} )
						: el(
							'div',
							{ className: 'lfuf-stand-schedule__preview' },
							el( 'strong', null, 'Weekly Schedule' ),
							el( 'p', { style: { fontSize: '0.8rem', opacity: 0.6 } },
								'Schedule data is rendered on the front end from the location\'s _lfuf_ss_schedule meta field.' +
								( highlightToday ? ' Today will be highlighted.' : '' )
							),
							el(
								'div',
								{ className: 'lfuf-stand-schedule__grid' },
								DAY_NAMES.map( function ( day, i ) {
									var isToday = i === new Date().getDay();
									return el(
										'div',
										{
											key: day,
											className: 'lfuf-stand-schedule__day' +
												( isToday && highlightToday ? ' lfuf-stand-schedule__day--today' : '' ),
										},
										el( 'span', { className: 'lfuf-stand-schedule__day-label' }, day ),
										el( 'span', { className: 'lfuf-stand-schedule__day-hours' },
											i === 6 ? '1:00 – 4:00 PM' : '—'
										)
									);
								} )
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
