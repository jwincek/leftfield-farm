/**
 * Availability Board — Interactivity API view module.
 *
 * REACTIVE PROXY RULES FOR WP 6.9:
 * 1. Store state for shared data, context for per-element read-only data.
 * 2. Object map (not array) for activeStatuses — property flips are tracked.
 * 3. No for...in on state objects — proxy may not track enumeration.
 *    Instead, use allStatuses (a plain array) to know which keys to check,
 *    then access each key on state.activeStatuses explicitly.
 * 4. All state reads directly inside getters — no helper functions.
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'leftfield/availability-board', {
    state: {
        // Initialized by wp_interactivity_state() in render.php.
        activeStatuses: {},           // { abundant: true, available: true, ... }
        allStatuses: [],              // ["abundant", "available", "limited", "sold_out", "unavailable"]
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

            // Check if any status is active by explicitly reading each property.
            // This ensures the reactive proxy tracks all dependencies.
            let anyActive = false;
            const keys = state.allStatuses;
            for ( let i = 0; i < keys.length; i++ ) {
                if ( state.activeStatuses[ keys[ i ] ] === true ) {
                    anyActive = true;
                    // Don't break — read ALL properties so the proxy tracks them all.
                    // Otherwise toggling an unread property won't trigger re-evaluation.
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
         * Uses itemStatuses from the group's context.
         */
        get isCurrentGroupHidden() {
            const ctx = getContext();

            if ( state.activeType && state.activeType !== ctx.groupSlug ) {
                return true;
            }

            // Check if any status is active.
            let anyActive = false;
            const keys = state.allStatuses;
            for ( let i = 0; i < keys.length; i++ ) {
                if ( state.activeStatuses[ keys[ i ] ] === true ) {
                    anyActive = true;
                }
            }

            if ( ! anyActive ) return false;

            // Check if any item in this group has an active status.
            const statuses = ctx.itemStatuses || [];
            for ( let i = 0; i < statuses.length; i++ ) {
                if ( state.activeStatuses[ statuses[ i ] ] === true ) {
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

            if ( state.activeType && state.activeType !== ctx.groupSlug ) {
                return '0';
            }

            let anyActive = false;
            const keys = state.allStatuses;
            for ( let i = 0; i < keys.length; i++ ) {
                if ( state.activeStatuses[ keys[ i ] ] === true ) {
                    anyActive = true;
                }
            }

            if ( ! anyActive ) {
                return String( ctx.itemCount || 0 );
            }

            const statuses = ctx.itemStatuses || [];
            let count = 0;
            for ( let i = 0; i < statuses.length; i++ ) {
                if ( state.activeStatuses[ statuses[ i ] ] === true ) {
                    count++;
                }
            }
            return String( count );
        },

        /**
         * Footer text.
         */
        get footerText() {
            // Read all status properties to register dependencies.
            let anyActive = false;
            const keys = state.allStatuses;
            for ( let i = 0; i < keys.length; i++ ) {
                if ( state.activeStatuses[ keys[ i ] ] === true ) {
                    anyActive = true;
                }
            }

            const { ref } = getElement();
            if ( ! ref ) return `Showing ${ state.totalItems } items`;

            const board = ref.closest( '[data-wp-interactive="leftfield/availability-board"]' );
            if ( ! board ) return `Showing ${ state.totalItems } items`;

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