/**
 * Availability Board — Interactivity API view module.
 *
 * activeStatuses is an object map: { abundant: true, available: true, ... }
 *
 * CRITICAL: All reads of state.activeStatuses[key] must happen DIRECTLY
 * inside getters (not in helper functions) so the Interactivity API's
 * reactive proxy can track the dependency and re-run the getter when
 * the property changes. Helper functions break the proxy tracking chain.
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
            const map = state.activeStatuses;

            // Check if any status is active.
            let anyActive = false;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            // Status filter: if any status is active, only show matching items.
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
         */
        get isCurrentGroupHidden() {
            const ctx = getContext();
            const groupSlug = ctx.groupSlug;

            if ( state.activeType && state.activeType !== groupSlug ) {
                return true;
            }

            // Check if any items in this group pass the status filter.
            const { ref } = getElement();
            if ( ! ref ) return false;

            const map = state.activeStatuses;
            let anyActive = false;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            // If no status filter is active, group is visible.
            if ( ! anyActive ) return false;

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            for ( const item of items ) {
                // Access the specific property on the proxy so it's tracked.
                if ( state.activeStatuses[ item.dataset.status ] === true ) {
                    return false; // At least one item visible.
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

            const map = state.activeStatuses;
            let anyActive = false;
            for ( const key in map ) {
                if ( map[ key ] ) {
                    anyActive = true;
                    break;
                }
            }

            const items = ref.querySelectorAll( '.lfuf-avail-board__item' );
            let count = 0;
            for ( const item of items ) {
                if ( ! anyActive || state.activeStatuses[ item.dataset.status ] === true ) {
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

            const map = state.activeStatuses;
            let anyActive = false;
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
        /**
         * Toggle a status filter.
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