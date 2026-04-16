/**
 * Availability Board — Interactivity API view module.
 *
 * KEY ARCHITECTURE:
 *
 * Shared filter state (activeStatuses, activeType, totalItems) lives
 * in the STORE STATE, initialized server-side via wp_interactivity_state().
 * All elements read from and write to this single source of truth.
 *
 * Per-element data (filterStatus, filterType, groupSlug, itemStatus,
 * itemType) lives in CONTEXT via data-wp-context on each element.
 * These are read-only identifiers — never written to by actions.
 *
 * This avoids the Interactivity API context inheritance issue where
 * writing to a child context doesn't propagate to sibling elements.
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'leftfield/availability-board', {
    state: {
        // These are initialized by wp_interactivity_state() in render.php.
        activeStatuses: [],
        activeType: '',
        totalItems: 0,

        /**
         * Is this status filter button's status in the active list?
         * Reads filterStatus from the button's context.
         * Reads activeStatuses from store state.
         */
        get isCurrentStatusActive() {
            const ctx = getContext();
            return state.activeStatuses.includes( ctx.filterStatus );
        },

        /**
         * Is this type filter button's type the active type?
         * Reads filterType from the button's context.
         * Reads activeType from store state.
         */
        get isCurrentTypeActive() {
            const ctx = getContext();
            return state.activeType === ctx.filterType;
        },

        /**
         * Should this item be hidden?
         * Reads itemStatus/itemType from the item's context.
         * Reads activeStatuses/activeType from store state.
         */
        get isCurrentItemHidden() {
            const ctx = getContext();

            // Status filter.
            if ( state.activeStatuses.length > 0 && ! state.activeStatuses.includes( ctx.itemStatus ) ) {
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
         * Reads groupSlug from the group's context.
         */
        get isCurrentGroupHidden() {
            const ctx = getContext();
            const groupSlug = ctx.groupSlug;

            // If a type filter is active and this group doesn't match.
            if ( state.activeType && state.activeType !== groupSlug ) {
                return true;
            }

            // Check if any items in this group pass the status filter.
            const { ref } = getElement();
            if ( ! ref ) {
                return false; // SSR fallback — show everything.
            }

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                if ( state.activeStatuses.length === 0 || state.activeStatuses.includes( itemStatus ) ) {
                    return false; // At least one item visible.
                }
            }

            return true; // No items pass.
        },

        /**
         * Visible item count for this group.
         */
        get currentGroupCount() {
            const ctx = getContext();
            const groupSlug = ctx.groupSlug;
            const { ref } = getElement();

            if ( ! ref ) return '';

            if ( state.activeType && state.activeType !== groupSlug ) {
                return '0';
            }

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                if ( state.activeStatuses.length === 0 || state.activeStatuses.includes( itemStatus ) ) {
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

            if ( ! ref ) {
                return `Showing ${ state.totalItems } items`;
            }

            const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
            if ( ! board ) {
                return `Showing ${ state.totalItems } items`;
            }

            const items = board.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                const itemType   = item.dataset.typeSlug;

                const statusMatch = state.activeStatuses.length === 0 || state.activeStatuses.includes( itemStatus );
                const typeMatch   = ! state.activeType || itemType === state.activeType;

                if ( statusMatch && typeMatch ) {
                    count++;
                }
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
         * Reads filterStatus from the button's context.
         * Writes to state.activeStatuses (store state, shared).
         */
        toggleStatus() {
            const ctx = getContext();
            const status = ctx.filterStatus;
            if ( ! status ) return;

            const idx = state.activeStatuses.indexOf( status );
            if ( idx >= 0 ) {
                state.activeStatuses = state.activeStatuses.filter( s => s !== status );
            } else {
                state.activeStatuses = [ ...state.activeStatuses, status ];
            }
        },

        /**
         * Set the product type filter.
         * Reads filterType from the button's context.
         * Writes to state.activeType (store state, shared).
         */
        setTypeFilter() {
            const ctx = getContext();
            state.activeType = ctx.filterType;
        },
    },

    callbacks: {
        initBoard() {
            // Fully server-rendered. Client handles filtering reactively.
        },
    },
} );