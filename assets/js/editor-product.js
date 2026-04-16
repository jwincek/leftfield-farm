/**
 * Product Editor Sidebar — custom panels for lfuf_product meta.
 *
 * Panels:
 *   1. Product Details — price, unit, growing notes
 *   2. Source Links    — search and link source posts
 */
( function () {
    'use strict';

    var el               = wp.element.createElement;
    var useState          = wp.element.useState;
    var useEffect         = wp.element.useEffect;
    var registerPlugin    = wp.plugins.registerPlugin;
    var PluginDocumentSettingPanel = wp.editor.PluginDocumentSettingPanel;
    var useEntityProp     = wp.coreData.useEntityProp;
    var useSelect         = wp.data.useSelect;
    var TextControl       = wp.components.TextControl;
    var TextareaControl   = wp.components.TextareaControl;
    var SelectControl     = wp.components.SelectControl;
    var Button            = wp.components.Button;
    var Spinner           = wp.components.Spinner;

    var COMMON_UNITS = [
        { label: '— Select —', value: '' },
        { label: 'bunch', value: 'bunch' },
        { label: 'bag', value: 'bag' },
        { label: 'loaf', value: 'loaf' },
        { label: 'half dozen', value: 'half dozen' },
        { label: 'dozen', value: 'dozen' },
        { label: 'pint', value: 'pint' },
        { label: 'pint jar', value: 'pint jar' },
        { label: 'quart', value: 'quart' },
        { label: 'half pound', value: 'half pound' },
        { label: 'pound', value: 'pound' },
        { label: 'each', value: 'each' },
        { label: 'plant', value: 'plant' },
        { label: 'flat', value: 'flat' },
        { label: 'other (type below)', value: '__custom' },
    ];

    /* ─────────────────────────────────────────────
     * Panel 1: Product Details
     * ───────────────────────────────────────────── */

    function ProductDetailsPanel() {
        var postType = useSelect( function ( select ) {
            return select( 'core/editor' ).getCurrentPostType();
        }, [] );

        if ( postType !== 'lfuf_product' ) return null;

        var _meta   = useEntityProp( 'postType', 'lfuf_product', 'meta' );
        var meta    = _meta[ 0 ];
        var setMeta = _meta[ 1 ];

        var _customUnit = useState( false );
        var showCustomUnit = _customUnit[ 0 ];
        var setShowCustomUnit = _customUnit[ 1 ];

        function updateMeta( key, value ) {
            var updated = {};
            updated[ key ] = value;
            setMeta( Object.assign( {}, meta, updated ) );
        }

        // Check if current unit is in the common list.
        var currentUnit = meta._lfuf_unit || '';
        var unitInList  = COMMON_UNITS.some( function ( u ) { return u.value === currentUnit; } );
        var isCustom    = showCustomUnit || ( currentUnit && ! unitInList );

        return el(
            PluginDocumentSettingPanel,
            {
                name: 'lfuf-product-details',
                title: 'Product Details',
                initialOpen: true,
                icon: 'carrot',
            },

            el( TextControl, {
                label: 'Price',
                value: meta._lfuf_price || '',
                onChange: function ( val ) { updateMeta( '_lfuf_price', val ); },
                placeholder: '$4',
                help: 'Display price. Can be "$5", "Donation", "$3-5", etc.',
            } ),

            el( SelectControl, {
                label: 'Unit of Sale',
                value: isCustom ? '__custom' : currentUnit,
                options: COMMON_UNITS,
                onChange: function ( val ) {
                    if ( val === '__custom' ) {
                        setShowCustomUnit( true );
                    } else {
                        setShowCustomUnit( false );
                        updateMeta( '_lfuf_unit', val );
                    }
                },
                help: 'How this product is sold.',
            } ),

            isCustom
                ? el( TextControl, {
                    label: 'Custom Unit',
                    value: currentUnit,
                    onChange: function ( val ) { updateMeta( '_lfuf_unit', val ); },
                    placeholder: 'e.g. 4 oz bag',
                } )
                : null,

            el( TextareaControl, {
                label: 'Growing / Baking Notes',
                value: meta._lfuf_growing_notes || '',
                onChange: function ( val ) { updateMeta( '_lfuf_growing_notes', val ); },
                placeholder: 'Heirloom variety, cold-hardy. No-till grown.',
                help: 'Shown on the product card and single product page.',
                rows: 3,
            } )
        );
    }

    /* ─────────────────────────────────────────────
     * Panel 2: Source Links
     * ───────────────────────────────────────────── */

    function ProductSourcesPanel() {
        var postType = useSelect( function ( select ) {
            return select( 'core/editor' ).getCurrentPostType();
        }, [] );

        if ( postType !== 'lfuf_product' ) return null;

        var _meta   = useEntityProp( 'postType', 'lfuf_product', 'meta' );
        var meta    = _meta[ 0 ];
        var setMeta = _meta[ 1 ];

        var sourceIds = meta._lfuf_source_ids || [];

        // Fetch all sources.
        var allSources = useSelect( function ( select ) {
            return select( 'core' ).getEntityRecords( 'postType', 'lfuf_source', {
                per_page: 50,
                status: 'publish',
                _fields: 'id,title',
            } ) || [];
        }, [] );

        // Fetch linked source details.
        var linkedSources = useSelect( function ( select ) {
            if ( ! sourceIds.length ) return [];
            return sourceIds.map( function ( id ) {
                return select( 'core' ).getEntityRecord( 'postType', 'lfuf_source', id );
            } ).filter( Boolean );
        }, [ sourceIds.join( ',' ) ] );

        function addSource( id ) {
            if ( sourceIds.indexOf( id ) === -1 ) {
                var updated = {};
                updated._lfuf_source_ids = sourceIds.concat( [ id ] );
                setMeta( Object.assign( {}, meta, updated ) );
            }
        }

        function removeSource( id ) {
            var updated = {};
            updated._lfuf_source_ids = sourceIds.filter( function ( s ) { return s !== id; } );
            setMeta( Object.assign( {}, meta, updated ) );
        }

        // Sources not already linked.
        var availableSources = allSources.filter( function ( s ) {
            return sourceIds.indexOf( s.id ) === -1;
        } );

        return el(
            PluginDocumentSettingPanel,
            {
                name: 'lfuf-product-sources',
                title: 'Sources',
                initialOpen: false,
                icon: 'admin-site-alt3',
            },

            el( 'p', {
                className: 'components-base-control__help',
                style: { marginTop: 0 },
            }, 'Link this product to grain origins or partner farms.' ),

            // Linked sources.
            linkedSources.length > 0
                ? el( 'div', { style: { marginBottom: '12px' } },
                    linkedSources.map( function ( source ) {
                        return el( 'div', {
                            key: source.id,
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 8px',
                                background: '#f0fdf4',
                                borderRadius: '4px',
                                marginBottom: '4px',
                                fontSize: '13px',
                            },
                        },
                            el( 'span', null, source.title?.rendered || '(untitled)' ),
                            el( Button, {
                                isSmall: true,
                                isDestructive: true,
                                icon: 'no-alt',
                                label: 'Remove',
                                onClick: function () { removeSource( source.id ); },
                            } )
                        );
                    } )
                )
                : null,

            // Add source dropdown.
            availableSources.length > 0
                ? el( SelectControl, {
                    value: '',
                    options: [ { label: '— Add a source —', value: '' } ].concat(
                        availableSources.map( function ( s ) {
                            return { label: s.title?.rendered || '(untitled)', value: s.id };
                        } )
                    ),
                    onChange: function ( val ) {
                        if ( val ) addSource( parseInt( val, 10 ) );
                    },
                } )
                : sourceIds.length === 0
                    ? el( 'p', { style: { color: '#6b7280', fontStyle: 'italic', fontSize: '13px' } },
                        'No sources created yet. Add them under Sources in the sidebar.' )
                    : null
        );
    }

    /* ─────────────────────────────────────────────
     * Register
     * ───────────────────────────────────────────── */

    registerPlugin( 'lfuf-product-details', {
        render: ProductDetailsPanel,
        icon: 'carrot',
    } );

    registerPlugin( 'lfuf-product-sources', {
        render: ProductSourcesPanel,
        icon: 'admin-site-alt3',
    } );

} )();
