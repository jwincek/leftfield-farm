/**
 * Availability Board — Interactivity API view module.
 *
 * activeStatuses is an object map: { abundant: true, available: true, ... }
 *
 * Group visibility and counts use itemStatuses arrays embedded in each
 * group's context by the server. This eliminates DOM queries (getElement)
 * for group-level getters, making them work reliably during both SSR
 * and client-side reactivity.
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'leftfield/availability-board', {
    state: {
        // Initialized by wp_interactivity_state() in render.php.
        activeStatuses: {},
        activeType: '',
        totalItems: 0,

        /**
         * Is this status filter button active?
         */
        get isCurrentStatusActive() {
            const ctx = getContext();
            return state.activeStatuses[ ctx.filterStatus ] === true;
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

            // Check if any status filter is active.
            let anyActive = false;
            const map = state.activeStatuses;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            // Status filter.
            if ( anyActive && state.activeStatuses[ ctx.itemStatus ] !== true ) {
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
         *
         * Uses itemStatuses from the group's context (embedded by PHP)
         * instead of DOM queries. Each status is checked directly on
         * state.activeStatuses so the proxy tracks the dependency.
         */
        get isCurrentGroupHidden() {
            const ctx = getContext();

            // Type filter: hide if a different type is selected.
            if ( state.activeType && state.activeType !== ctx.groupSlug ) {
                return true;
            }

            // Check if any status filter is active.
            let anyActive = false;
            const map = state.activeStatuses;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            // No status filter active → show all groups.
            if ( ! anyActive ) return false;

            // Check if any item in this group has an active status.
            // itemStatuses is an array like ["abundant", "available", "available", "limited"]
            // embedded in the group's context by PHP.
            const statuses = ctx.itemStatuses || [];
            for ( const s of statuses ) {
                if ( state.activeStatuses[ s ] === true ) {
                    return false; // At least one item visible.
                }
            }

            return true; // No items pass the filter.
        },

        /**
         * Visible item count for this group.
         * Uses itemStatuses from context instead of DOM queries.
         */
        get currentGroupCount() {
            const ctx = getContext();

            if ( state.activeType && state.activeType !== ctx.groupSlug ) {
                return '0';
            }

            let anyActive = false;
            const map = state.activeStatuses;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            if ( ! anyActive ) {
                return String( ctx.itemCount || 0 );
            }

            const statuses = ctx.itemStatuses || [];
            let count = 0;
            for ( const s of statuses ) {
                if ( state.activeStatuses[ s ] === true ) {
                    count++;
                }
            }
            return String( count );
        },

        /**
         * Footer text.
         * Still uses DOM query from the footer element since it needs
         * to count across ALL groups, not just the current one.
         */
        get footerText() {
            const { ref } = getElement();
            if ( ! ref ) return `Showing ${ state.totalItems } items`;

            const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
            if ( ! board ) return `Showing ${ state.totalItems } items`;

            let anyActive = false;
            const map = state.activeStatuses;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            const items = board.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                const statusMatch = ! anyActive || state.activeStatuses[ item.dataset.status ] === true;
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
        toggleStatus() {
            const ctx = getContext();
            const status = ctx.filterStatus;
            if ( ! status ) return;
            state.activeStatuses[ status ] = ! state.activeStatuses[ status ];
        },

        setTypeFilter() {
            const ctx = getContext();
            state.activeType = ctx.filterType;
        },
    },

    callbacks: {
        initBoard() {},
    },
} );