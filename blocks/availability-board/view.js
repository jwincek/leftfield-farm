/**
 * Availability Board — Interactivity API view module.
 *
 * activeStatuses is an object map: { abundant: true, available: true, ... }
 * instead of an array. The Interactivity API's reactive proxy reliably
 * tracks individual property changes on objects. Array reassignment
 * (state.arr = [...newArr]) does not trigger reactivity in WP 6.9.
 *
 * The toggle action simply flips a boolean property:
 *   state.activeStatuses[ status ] = !state.activeStatuses[ status ]
 *
 * Getters check: state.activeStatuses[ ctx.itemStatus ] === true
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Helper: check if ANY status filter is active.
 * When no statuses are active, we show everything (no filter applied).
 */
function hasActiveStatus() {
    const map = state.activeStatuses;
    for ( const key in map ) {
        if ( map[ key ] ) return true;
    }
    return false;
}

/**
 * Helper: check if a specific status is active.
 */
function isStatusOn( status ) {
    return state.activeStatuses[ status ] === true;
}

const { state } = store( 'leftfield/availability-board', {
    state: {
        // Initialized by wp_interactivity_state() in render.php.
        // Shape: { abundant: true, available: true, limited: true, sold_out: false, unavailable: false }
        activeStatuses: {},
        activeType: '',
        totalItems: 0,

        /**
         * Is this status filter button active?
         */
        get isCurrentStatusActive() {
            const ctx = getContext();
            return isStatusOn( ctx.filterStatus );
        },

        /**
         * Is this type filter button active?
         */
        get isCurrentTypeActive() {
            const ctx = getContext();
            return state.activeType === ctx.filterType;
        },

        /**
         * Should this item be hidden?
         */
        get isCurrentItemHidden() {
            const ctx = getContext();

            // Status filter: if any status is active, only show matching items.
            if ( hasActiveStatus() && ! isStatusOn( ctx.itemStatus ) ) {
                return true;
            }

            // Type filter.
            if ( state.activeType && ctx.itemType !== state.activeType ) {
                return true;
            }

            return false;
        },

        /**
         * Should this group be hidden?
         */
        get isCurrentGroupHidden() {
            const ctx = getContext();
            const groupSlug = ctx.groupSlug;

            if ( state.activeType && state.activeType !== groupSlug ) {
                return true;
            }

            // Check if any items pass the status filter.
            const { ref } = getElement();
            if ( ! ref ) return false;

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                if ( ! hasActiveStatus() || isStatusOn( itemStatus ) ) {
                    return false;
                }
            }

            return true;
        },

        /**
         * Visible item count for this group.
         */
        get currentGroupCount() {
            const ctx = getContext();
            const { ref } = getElement();
            if ( ! ref ) return '';

            if ( state.activeType && state.activeType !== ctx.groupSlug ) {
                return '0';
            }

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                if ( ! hasActiveStatus() || isStatusOn( item.dataset.status ) ) {
                    count++;
                }
            }
            return String( count );
        },

        /**
         * Footer text.
         */
        get footerText() {
            const { ref } = getElement();
            if ( ! ref ) return `Showing ${ state.totalItems } items`;

            const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
            if ( ! board ) return `Showing ${ state.totalItems } items`;

            const items = board.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                const statusMatch = ! hasActiveStatus() || isStatusOn( item.dataset.status );
                const typeMatch   = ! state.activeType || item.dataset.typeSlug === state.activeType;
                if ( statusMatch && typeMatch ) count++;
            }

            if ( count === state.totalItems ) {
                return `Showing ${ count } items`;
            }
            return `Showing ${ count } of ${ state.totalItems } items`;
        },
    },

    actions: {
        /**
         * Toggle a status filter.
         * Flips a boolean property on the object map — reliable reactivity.
         */
        toggleStatus() {
            const ctx = getContext();
            const status = ctx.filterStatus;
            if ( ! status ) return;

            state.activeStatuses[ status ] = ! state.activeStatuses[ status ];
        },

        /**
         * Set the product type filter.
         */
        setTypeFilter() {
            const ctx = getContext();
            state.activeType = ctx.filterType;
        },
    },

    callbacks: {
        initBoard() {},
    },
} );