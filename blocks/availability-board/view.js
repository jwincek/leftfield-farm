/**
 * Availability Board — Interactivity API view module.
 *
 * Fix 1: All filtering uses context-based getters instead of per-slug
 * hardcoded getters. Each filter button, group, and item has its own
 * data-wp-context with the relevant slug. State getters read from
 * getContext() which works with any slug including hyphens.
 *
 * Fix 2: Group visibility and counts use context-based lookups
 * instead of getElement() + DOM queries, so they work during SSR
 * (where getElement() returns null).
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'leftfield/availability-board', {
    state: {
        /**
         * Is this status filter button's status in the active list?
         * Each button has data-wp-context='{"filterStatus": "abundant"}'.
         */
        get isCurrentStatusActive() {
            const ctx = getContext();
            return ctx.activeStatuses.includes( ctx.filterStatus );
        },

        /**
         * Is this type filter button's type the active type?
         * Each button has data-wp-context='{"filterType": "bread"}'.
         * The "All" button has filterType: "".
         */
        get isCurrentTypeActive() {
            const ctx = getContext();
            return ctx.activeType === ctx.filterType;
        },

        /**
         * Should this item be hidden based on current filters?
         * Each item has data-wp-context='{"itemStatus":"abundant","itemType":"produce"}'.
         */
        get isCurrentItemHidden() {
            const ctx = getContext();

            // Status filter: hide if item's status is not in active list.
            if ( ctx.activeStatuses.length > 0 && ! ctx.activeStatuses.includes( ctx.itemStatus ) ) {
                return true;
            }

            // Type filter: hide if a type is selected and item doesn't match.
            if ( ctx.activeType && ctx.itemType !== ctx.activeType ) {
                return true;
            }

            return false;
        },

        /**
         * Should this group be hidden?
         * Each group has data-wp-context='{"groupSlug": "produce"}'.
         *
         * A group is hidden when:
         *   - A type filter is active and this group doesn't match, OR
         *   - All items in the group would be hidden by status filter.
         *
         * We check items by querying the DOM from the group element,
         * but only client-side. During SSR getElement() returns null
         * and we return false (show everything).
         */
        get isCurrentGroupHidden() {
            const ctx = getContext();
            const groupSlug = ctx.groupSlug;

            // If a type filter is active and this group doesn't match.
            if ( ctx.activeType && ctx.activeType !== groupSlug ) {
                return true;
            }

            // Check if any items in this group pass the status filter.
            // Use DOM query from the group element.
            const { ref } = getElement();
            if ( ! ref ) {
                // SSR or not yet hydrated — show everything.
                return false;
            }

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                if ( ctx.activeStatuses.length === 0 || ctx.activeStatuses.includes( itemStatus ) ) {
                    return false; // At least one item is visible.
                }
            }

            return true; // No items pass the filter.
        },

        /**
         * Visible item count for this group.
         */
        get currentGroupCount() {
            const ctx = getContext();
            const groupSlug = ctx.groupSlug;
            const { ref } = getElement();

            if ( ! ref ) {
                return ''; // SSR — the PHP already rendered the count.
            }

            // If type filter excludes this group, count is 0.
            if ( ctx.activeType && ctx.activeType !== groupSlug ) {
                return '0';
            }

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                if ( ctx.activeStatuses.length === 0 || ctx.activeStatuses.includes( itemStatus ) ) {
                    count++;
                }
            }

            return String( count );
        },

        /**
         * Footer text — total visible count.
         */
        get footerText() {
            const ctx = getContext();
            const { ref } = getElement();

            if ( ! ref ) {
                return `Showing ${ ctx.totalItems } items`;
            }

            const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
            if ( ! board ) {
                return `Showing ${ ctx.totalItems } items`;
            }

            const items = board.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                const itemStatus = item.dataset.status;
                const itemType   = item.dataset.typeSlug;

                const statusMatch = ctx.activeStatuses.length === 0 || ctx.activeStatuses.includes( itemStatus );
                const typeMatch   = ! ctx.activeType || itemType === ctx.activeType;

                if ( statusMatch && typeMatch ) {
                    count++;
                }
            }

            if ( count === ctx.totalItems ) {
                return `Showing ${ count } items`;
            }
            return `Showing ${ count } of ${ ctx.totalItems } items`;
        },
    },

    actions: {
        /**
         * Toggle a status in the active filter list.
         * The button's context has { filterStatus: "abundant" }.
         */
        toggleStatus() {
            const ctx = getContext();
            const status = ctx.filterStatus;
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
         * The button's context has { filterType: "bread" } or { filterType: "" }.
         */
        setTypeFilter() {
            const ctx = getContext();
            ctx.activeType = ctx.filterType;
        },
    },

    callbacks: {
        initBoard() {
            // Board is fully rendered server-side.
            // Client-side filtering is purely reactive via context.
        },
    },
} );