/**
 * Stand Quick Toggle — editor-only control block (no-build IIFE).
 *
 * Renders a toggle switch + message input that hit the REST API
 * directly from the editor. Renders nothing on the front end.
 */
( function ( blocks, element, blockEditor, components, data ) {
	'use strict';

	var el = element.createElement;
	var useState = element.useState;
	var useEffect = element.useEffect;
	var useCallback = element.useCallback;
	var Fragment = element.Fragment;
	var registerBlockType = blocks.registerBlockType;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var ComboboxControl = components.ComboboxControl;
	var ToggleControl = components.ToggleControl;
	var TextControl = components.TextControl;
	var Button = components.Button;
	var Spinner = components.Spinner;
	var Notice = components.Notice;
	var useSelect = data.useSelect;

	function getRestBase() {
		return ( window.lfufStandSettings || window.lfufSettings || {} ).restBase || '/wp-json/lfuf/v1';
	}

	function getNonce() {
		return ( window.lfufStandSettings || window.lfufSettings || {} ).nonce || '';
	}

	registerBlockType( 'lfuf/stand-toggle', {
		edit: function EditStandToggle( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var locationId = attributes.locationId;
			var blockProps = useBlockProps( { className: 'lfuf-stand-toggle' } );

			var _state = useState( false );
			var isOpen = _state[0];
			var setIsOpen = _state[1];

			var _msg = useState( '' );
			var message = _msg[0];
			var setMessage = _msg[1];

			var _saving = useState( false );
			var saving = _saving[0];
			var setSaving = _saving[1];

			var _notice = useState( '' );
			var notice = _notice[0];
			var setNotice = _notice[1];

			var _loaded = useState( false );
			var loaded = _loaded[0];
			var setLoaded = _loaded[1];

			// Fetch locations for selector.
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

			// Load current state from REST.
			useEffect( function () {
				if ( ! locationId ) return;
				setLoaded( false );
				fetch( getRestBase() + '/stand/' + locationId + '/info' )
					.then( function ( r ) { return r.json(); } )
					.then( function ( data ) {
						setIsOpen( !! data.is_open );
						setMessage( data.status_message || '' );
						setLoaded( true );
					} )
					.catch( function () {
						setLoaded( true );
					} );
			}, [ locationId ] );

			// Save handler.
			var save = useCallback( function () {
				if ( ! locationId ) return;
				setSaving( true );
				setNotice( '' );
				fetch( getRestBase() + '/stand/' + locationId + '/status', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': getNonce(),
					},
					body: JSON.stringify( {
						is_open: isOpen,
						status_message: message,
					} ),
				} )
					.then( function ( r ) { return r.json(); } )
					.then( function ( data ) {
						setSaving( false );
						setNotice( 'Stand is now ' + ( data.is_open ? 'OPEN' : 'CLOSED' ) + '.' );
						setTimeout( function () { setNotice( '' ); }, 4000 );
					} )
					.catch( function () {
						setSaving( false );
						setNotice( 'Error updating stand status.' );
					} );
			}, [ locationId, isOpen, message ] );

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
					)
				),
				el(
					'div',
					blockProps,
					! locationId
						? el( components.Placeholder, {
							icon: 'controls-repeat',
							label: 'Stand Quick Toggle',
							instructions: 'Select a location in the sidebar.',
						} )
						: ! loaded
							? el( 'div', { className: 'lfuf-stand-toggle__loading' },
								el( Spinner ),
								' Loading stand status…'
							)
							: el(
								'div',
								{ className: 'lfuf-stand-toggle__panel' },
								el(
									'div',
									{ className: 'lfuf-stand-toggle__header' },
									el( 'span', {
										className: 'lfuf-stand-toggle__dot lfuf-stand-toggle__dot--' +
											( isOpen ? 'open' : 'closed' ),
									} ),
									el( 'strong', null, isOpen ? 'Stand is OPEN' : 'Stand is CLOSED' )
								),
								el( ToggleControl, {
									label: isOpen ? 'Open' : 'Closed',
									checked: isOpen,
									onChange: function ( val ) { setIsOpen( val ); },
								} ),
								el( TextControl, {
									label: 'Status message (optional)',
									value: message,
									onChange: function ( val ) { setMessage( val ); },
									placeholder: 'e.g. "Back at 2 PM" or "Sold out for today"',
								} ),
								el(
									'div',
									{ className: 'lfuf-stand-toggle__actions' },
									el( Button, {
										variant: 'primary',
										onClick: save,
										isBusy: saving,
										disabled: saving,
									}, saving ? 'Saving…' : 'Update Stand Status' )
								),
								notice
									? el( Notice, {
										status: notice.includes( 'Error' ) ? 'error' : 'success',
										isDismissible: true,
										onDismiss: function () { setNotice( '' ); },
									}, notice )
									: null
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
