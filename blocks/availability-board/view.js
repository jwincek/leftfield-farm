/**
 * Availability Board — Interactivity API view module.
 *
 * Handles client-side filtering of the server-rendered board.
 * All items are rendered by PHP; this module shows/hides them
 * based on active status and type filters. No additional fetches
 * needed for filtering — pure client-side reactivity.
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'leftfield/availability-board', {
    state: {
        /**
         * Dynamic getters for status filter buttons.
         * The render.php generates data-wp-class bindings like:
         *   state.isStatusActive_abundant
         *   state.isStatusActive_available
         * etc. We create these as a Proxy pattern via individual getters.
         */
        get isStatusActive_abundant() {
            return getContext().activeStatuses.includes( 'abundant' );
        },
        get isStatusActive_available() {
            return getContext().activeStatuses.includes( 'available' );
        },
        get isStatusActive_limited() {
            return getContext().activeStatuses.includes( 'limited' );
        },
        get isStatusActive_sold_out() {
            return getContext().activeStatuses.includes( 'sold_out' );
        },
        get isStatusActive_unavailable() {
            return getContext().activeStatuses.includes( 'unavailable' );
        },

        /**
         * Dynamic getters for type filter buttons.
         * Generated from the filter_types in render.php.
         */
        get isTypeActive_produce() {
            return getContext().activeType === 'produce';
        },
        get isTypeActive_bread() {
            return getContext().activeType === 'bread';
        },
        get isTypeActive_baked_good() {
            return getContext().activeType === 'baked-good';
        },
        get isTypeActive_pantry_good() {
            return getContext().activeType === 'pantry-good';
        },
        get isTypeActive_seedling() {
            return getContext().activeType === 'seedling';
        },

        /**
         * Per-item visibility.
         * Bound via data-wp-bind--hidden="state.isItemHidden" on each item.
         * Uses getElement() to read data attributes from the DOM element.
         */
        get isItemHidden() {
            const ctx = getContext();
            const { ref } = getElement();
            if ( ! ref ) return false;

            const itemStatus = ref.dataset.status;
            const itemType   = ref.dataset.typeSlug;

            // Status filter: hide if item's status is not in active list.
            if ( ctx.activeStatuses.length > 0 && ! ctx.activeStatuses.includes( itemStatus ) ) {
                return true;
            }

            // Type filter: hide if a type is selected and item doesn't match.
            if ( ctx.activeType && itemType !== ctx.activeType ) {
                return true;
            }

            return false;
        },

        /**
         * Per-group visibility — hide groups with zero visible items.
         */
        get isGroupHidden_produce() {
            return isGroupHidden( 'produce' );
        },
        get isGroupHidden_bread() {
            return isGroupHidden( 'bread' );
        },
        get isGroupHidden_baked_good() {
            return isGroupHidden( 'baked-good' );
        },
        get isGroupHidden_pantry_good() {
            return isGroupHidden( 'pantry-good' );
        },
        get isGroupHidden_seedling() {
            return isGroupHidden( 'seedling' );
        },
        get isGroupHidden_other() {
            return isGroupHidden( 'other' );
        },

        /**
         * Group counts (visible items only).
         */
        get groupCount_produce() { return countVisibleInGroup( 'produce' ); },
        get groupCount_bread() { return countVisibleInGroup( 'bread' ); },
        get groupCount_baked_good() { return countVisibleInGroup( 'baked-good' ); },
        get groupCount_pantry_good() { return countVisibleInGroup( 'pantry-good' ); },
        get groupCount_seedling() { return countVisibleInGroup( 'seedling' ); },
        get groupCount_other() { return countVisibleInGroup( 'other' ); },

        /**
         * Footer text.
         */
        get footerText() {
            const count = countAllVisible();
            const ctx = getContext();
            if ( count === ctx.totalItems ) {
                return `Showing ${ count } items`;
            }
            return `Showing ${ count } of ${ ctx.totalItems } items`;
        },
    },

    actions: {
        /**
         * Toggle a status in the active filter list.
         */
        toggleStatus( event ) {
            const ctx = getContext();
            const status = event.target.closest( '[data-status]' )?.dataset.status;
            if ( ! status ) return;

            const idx = ctx.activeStatuses.indexOf( status );
            if ( idx >= 0 ) {
                ctx.activeStatuses = ctx.activeStatuses.filter( s => s !== status );
            } else {
                ctx.activeStatuses = [ ...ctx.activeStatuses, status ];
            }
        },

        /**
         * Set the product type filter.
         */
        setTypeFilter( event ) {
            const ctx = getContext();
            const slug = event.target.closest( '[data-type-slug]' )?.dataset.typeSlug ?? '';
            ctx.activeType = slug;
        },
    },

    callbacks: {
        /**
         * Called on block hydration via data-wp-init.
         * Could set up polling for board updates here if needed.
         */
        initBoard() {
            // Board is fully rendered server-side.
            // Filtering is pure client-side reactivity.
            // Future: add polling via setInterval or watch() in WP 7.0.
        },
    },
} );

/**
 * Check if a product type group should be hidden.
 * A group is hidden when:
 *   - A type filter is active and this isn't the selected type, OR
 *   - All items in the group are hidden by status filter.
 */
function isGroupHidden( typeSlug ) {
    const ctx = getContext();

    // If a type filter is active and this group doesn't match, hide it.
    if ( ctx.activeType && ctx.activeType !== typeSlug ) {
        return true;
    }

    // If no items in this group pass the status filter, hide it.
    return countVisibleInGroup( typeSlug ) === 0;
}

/**
 * Count visible items in a group based on current filters.
 */
function countVisibleInGroup( typeSlug ) {
    const ctx = getContext();
    const { ref } = getElement();
    if ( ! ref ) return 0;

    // Walk up to the board root to query items.
    const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
    if ( ! board ) return 0;

    const items = board.querySelectorAll(
        `.lfuf-avail-board__item[data-type-slug="${ typeSlug }"]`
    );

    let count = 0;
    items.forEach( item => {
        const itemStatus = item.dataset.status;
        if ( ctx.activeStatuses.length === 0 || ctx.activeStatuses.includes( itemStatus ) ) {
            count++;
        }
    } );

    return count;
}

/**
 * Count all visible items across all groups.
 */
function countAllVisible() {
    const ctx = getContext();
    const { ref } = getElement();
    if ( ! ref ) return ctx.totalItems;

    const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
    if ( ! board ) return ctx.totalItems;

    const items = board.querySelectorAll( '.lfuf-avail-board__item' );

    let count = 0;
    items.forEach( item => {
        const itemStatus = item.dataset.status;
        const itemType   = item.dataset.typeSlug;

        const statusMatch = ctx.activeStatuses.length === 0 || ctx.activeStatuses.includes( itemStatus );
        const typeMatch   = ! ctx.activeType || itemType === ctx.activeType;

        if ( statusMatch && typeMatch ) {
            count++;
        }
    } );

    return count;
}
