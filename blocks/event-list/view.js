/**
 * Event List — Interactivity API view module.
 *
 * Handles:
 *  - Event type filtering (client-side show/hide)
 *  - RSVP form submission (async action → REST API)
 *  - RSVP cancellation via token
 *
 * Store namespace: leftfield/event-list
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'leftfield/event-list', {
    state: {
        /**
         * Per-event visibility based on type filter.
         */
        get isEventHidden() {
            const ctx = getContext();
            const { ref } = getElement();
            if ( ! ref || ! ctx.activeTypeFilter ) return false;

            const eventType = ref.dataset.typeSlug;
            return eventType !== ctx.activeTypeFilter;
        },

        /**
         * RSVP summary text.
         */
        get rsvpSummaryText() {
            const ctx = getContext();
            let text = `${ ctx.headcount } people coming`;
            if ( ctx.spotsLeft !== null ) {
                text += ` · ${ ctx.spotsLeft } spots left`;
            }
            return text;
        },

        /**
         * RSVP button text.
         */
        get rsvpButtonText() {
            const ctx = getContext();
            return ctx.submitting ? 'Sending…' : "I'm coming!";
        },
    },

    actions: {
        /**
         * Set the event type filter.
         */
        setTypeFilter( event ) {
            const ctx = getContext();
            const slug = event.target.closest( '[data-type-slug]' )?.dataset.typeSlug ?? '';
            ctx.activeTypeFilter = slug;

            // Update button active states.
            const board = event.target.closest( '[data-wp-interactive="leftfield/event-list"]' );
            if ( board ) {
                board.querySelectorAll( '.lfuf-event-list__filter-btn' ).forEach( btn => {
                    const btnSlug = btn.dataset.typeSlug;
                    btn.classList.toggle(
                        'lfuf-event-list__filter-btn--active',
                        btnSlug === slug || ( slug === '' && btnSlug === '' ),
                    );
                } );
            }
        },

        /**
         * Update RSVP form fields in context.
         */
        updateRsvpName( event ) {
            const ctx = getContext();
            ctx.rsvpName = event.target.value;
        },

        updateRsvpSize( event ) {
            const ctx = getContext();
            ctx.rsvpSize = Math.max( 1, parseInt( event.target.value ) || 1 );
        },

        /**
         * Track honeypot field — bots fill this, humans don't see it.
         */
        updateHoneypot( event ) {
            const ctx = getContext();
            ctx._hp = event.target.value;
        },

        /**
         * Submit an RSVP via the REST API.
         */
        *submitRsvp() {
            const ctx = getContext();

            if ( ! ctx.rsvpName.trim() ) {
                ctx.rsvpError = 'Please enter your name.';
                return;
            }

            ctx.submitting = true;
            ctx.rsvpError = '';

            try {
                const response = yield fetch(
                    `${ ctx.restBase }/events/${ ctx.eventId }/rsvp`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify( {
                            name: ctx.rsvpName.trim(),
                            email: ctx.rsvpEmail,
                            party_size: ctx.rsvpSize,
                            note: ctx.rsvpNote,
                            website: ctx._hp || '', // Honeypot field.
                        } ),
                    },
                );

                const data = yield response.json();

                if ( ! response.ok ) {
                    ctx.rsvpError = data.message || 'Something went wrong.';
                    ctx.submitting = false;
                    return;
                }

                // Success.
                ctx.rsvpSubmitted = true;
                ctx.rsvpMessage = data.message || "You're on the list!";
                ctx.rsvpToken = data.rsvp?.token || '';
                ctx.headcount = data.summary?.headcount ?? ctx.headcount + ctx.rsvpSize;
                ctx.spotsLeft = data.summary?.spots_left ?? ctx.spotsLeft;
                ctx.isFull = data.summary?.is_full ?? false;
            } catch ( err ) {
                ctx.rsvpError = 'Network error. Please try again.';
            }

            ctx.submitting = false;
        },

        /**
         * Cancel an RSVP using the stored token.
         */
        *cancelRsvp() {
            const ctx = getContext();
            if ( ! ctx.rsvpToken ) return;

            try {
                const response = yield fetch(
                    `${ ctx.restBase }/rsvp/${ ctx.rsvpToken }`,
                    { method: 'DELETE' },
                );

                if ( response.ok ) {
                    ctx.rsvpSubmitted = false;
                    ctx.rsvpMessage = '';
                    ctx.rsvpToken = '';
                    ctx.rsvpName = '';
                    ctx.rsvpSize = 1;
                    ctx.headcount = Math.max( 0, ctx.headcount - ctx.rsvpSize );
                    if ( ctx.spotsLeft !== null ) {
                        ctx.spotsLeft = ctx.spotsLeft + ctx.rsvpSize;
                    }
                    ctx.isFull = false;
                }
            } catch ( err ) {
                // Silently fail.
            }
        },
    },

    callbacks: {},
} );