/**
 * Availability Board — Interactivity API view module.
 *
 * CRITICAL: Do NOT declare default values for state properties that are
 * initialized server-side via wp_interactivity_state(). The server values
 * are injected into the store BEFORE this module runs. If we declare
 * state: { activeStatuses: {} }, it OVERWRITES the server values.
 *
 * Only declare computed getters here. The server provides:
 *   - state.activeStatuses  (object map)
 *   - state.allStatuses     (array of status keys)
 *   - state.activeType      (string)
 *   - state.totalItems      (number)
 *
 * Store namespace: leftfield/availability-board
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'leftfield/availability-board', {
    state: {
        // NO default values here — they come from wp_interactivity_state().

        get isCurrentStatusActive() {
            const ctx = getContext();
            return state.activeStatuses[ ctx.filterStatus ] === true;
        },

        get isCurrentTypeActive() {
            const ctx = getContext();
            return state.activeType === ctx.filterType;
        },

        get isCurrentItemHidden() {
            const ctx = getContext();

            // Read ALL status properties to register proxy dependencies.
            let anyActive = false;
            const keys = state.allStatuses;
            for ( let i = 0; i < keys.length; i++ ) {
                if ( state.activeStatuses[ keys[ i ] ] === true ) {
                    anyActive = true;
                }
            }

            if ( anyActive && state.activeStatuses[ ctx.itemStatus ] !== true ) {
                return true;
            }

            if ( state.activeType && ctx.itemType !== state.activeType ) {
                return true;
            }

            return false;
        },

        get isCurrentGroupHidden() {
            const ctx = getContext();

            if ( state.activeType && state.activeType !== ctx.groupSlug ) {
                return true;
            }

            let anyActive = false;
            const keys = state.allStatuses;
            for ( let i = 0; i < keys.length; i++ ) {
                if ( state.activeStatuses[ keys[ i ] ] === true ) {
                    anyActive = true;
                }
            }

            if ( ! anyActive ) return false;

            const statuses = ctx.itemStatuses || [];
            for ( let i = 0; i < statuses.length; i++ ) {
                if ( state.activeStatuses[ statuses[ i ] ] === true ) {
                    return false;
                }
            }

            return true;
        },

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

        get footerText() {
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