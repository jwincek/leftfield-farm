<?php
/**
 * Shared event card rendering helper.
 *
 * Used by both the event-list and event-card block render.php files.
 * Lives in the event-manager module so it's loaded once when the
 * module bootstraps, avoiding redeclaration errors.
 */

declare(strict_types=1);

namespace Leftfield\EventManager\Render;

defined('ABSPATH') || exit;

/**
 * Render a single event card as HTML.
 *
 * @param array  $event        Event data from build_event_data().
 * @param bool   $show_image   Whether to show the thumbnail.
 * @param bool   $show_rsvp    Whether to show the RSVP form.
 * @param bool   $show_location Whether to show location details.
 * @return string HTML output.
 */
function render_event_card(array $event, bool $show_image, bool $show_rsvp, bool $show_location): string {
    $id         = (int) $event['id'];
    $cancelled  = (bool) $event['cancelled'];
    $start_ts   = $event['start'] ? strtotime($event['start']) : 0;
    $end_ts     = $event['end'] ? strtotime($event['end']) : 0;
    $type_slug  = $event['event_slugs'][0] ?? '';
    $rsvp       = $event['rsvp'];

    // Format date/time.
    $date_str = $start_ts ? date_i18n('l, F j', $start_ts) : '';
    $time_str = $start_ts ? date_i18n('g:i A', $start_ts) : '';
    if ($end_ts) {
        $time_str .= ' – ' . date_i18n('g:i A', $end_ts);
    }

    // RSVP context for this specific event.
    $rsvp_context = wp_json_encode([
        'eventId'       => $id,
        'rsvpName'      => '',
        'rsvpEmail'     => '',
        'rsvpSize'      => 1,
        'rsvpNote'      => '',
        'rsvpSubmitted' => false,
        'rsvpMessage'   => '',
        'rsvpToken'     => '',
        'rsvpError'     => '',
        'submitting'    => false,
        'headcount'     => $rsvp ? (int) $rsvp['headcount'] : 0,
        'spotsLeft'     => $rsvp ? $rsvp['spots_left'] : null,
        'isFull'        => $rsvp ? (bool) $rsvp['is_full'] : false,
    ]);

    ob_start();
    ?>
    <article
        class="lfuf-event-card<?php echo $cancelled ? ' lfuf-event-card--cancelled' : ''; ?>"
        data-type-slug="<?php echo esc_attr($type_slug); ?>"
        data-wp-bind--hidden="state.isEventHidden"
        data-wp-context='<?php echo esc_attr($rsvp_context); ?>'
    >
        <?php if ($show_image && $event['thumbnail_url']) : ?>
            <div class="lfuf-event-card__image">
                <img src="<?php echo esc_url($event['thumbnail_url']); ?>"
                     alt="<?php echo esc_attr($event['title']); ?>"
                     loading="lazy">
            </div>
        <?php endif; ?>

        <div class="lfuf-event-card__body">
            <div class="lfuf-event-card__header">
                <?php if ($event['event_types']) : ?>
                    <span class="lfuf-event-card__type-badge">
                        <?php echo esc_html($event['event_types'][0]); ?>
                    </span>
                <?php endif; ?>

                <?php if ($cancelled) : ?>
                    <span class="lfuf-event-card__cancelled-badge">
                        <?php esc_html_e('Cancelled', 'leftfield-farm'); ?>
                    </span>
                <?php endif; ?>
            </div>

            <h4 class="lfuf-event-card__title">
                <a href="<?php echo esc_url($event['permalink']); ?>">
                    <?php echo esc_html($event['title']); ?>
                </a>
            </h4>

            <?php if ($date_str) : ?>
                <p class="lfuf-event-card__datetime">
                    <span class="lfuf-event-card__date"><?php echo esc_html($date_str); ?></span>
                    <?php if ($time_str) : ?>
                        <span class="lfuf-event-card__time"><?php echo esc_html($time_str); ?></span>
                    <?php endif; ?>
                </p>
            <?php endif; ?>

            <?php if ($show_location && $event['location']) : ?>
                <p class="lfuf-event-card__location">
                    📍 <?php echo esc_html($event['location']['title']); ?>
                    <?php if ($event['location']['address']) : ?>
                        <span class="lfuf-event-card__address">— <?php echo esc_html($event['location']['address']); ?></span>
                    <?php endif; ?>
                </p>
            <?php endif; ?>

            <?php if ($event['excerpt']) : ?>
                <p class="lfuf-event-card__excerpt"><?php echo esc_html($event['excerpt']); ?></p>
            <?php endif; ?>

            <div class="lfuf-event-card__details">
                <?php if ($event['cost_note']) : ?>
                    <span class="lfuf-event-card__cost">💸 <?php echo esc_html($event['cost_note']); ?></span>
                <?php endif; ?>
                <?php if ($event['what_to_bring']) : ?>
                    <span class="lfuf-event-card__bring">🧺 <?php echo esc_html($event['what_to_bring']); ?></span>
                <?php endif; ?>
            </div>

            <?php if ($event['donation_link'] && ! $cancelled) : ?>
                <a class="lfuf-event-card__donate-link"
                   href="<?php echo esc_url($event['donation_link']); ?>"
                   target="_blank"
                   rel="noopener noreferrer">
                    <?php esc_html_e('Donate / Pay', 'leftfield-farm'); ?>
                </a>
            <?php endif; ?>

            <?php if ($show_rsvp && $rsvp && $rsvp['enabled'] && ! $cancelled) : ?>
                <div class="lfuf-event-card__rsvp">
                    <div class="lfuf-event-card__rsvp-summary">
                        <span data-wp-text="state.rsvpSummaryText">
                            <?php
                            printf(
                                esc_html__('%d people coming', 'leftfield-farm'),
                                (int) $rsvp['headcount'],
                            );
                            if ($rsvp['spots_left'] !== null) {
                                printf(' · %s', sprintf(
                                    esc_html__('%d spots left', 'leftfield-farm'),
                                    (int) $rsvp['spots_left'],
                                ));
                            }
                            ?>
                        </span>
                    </div>

                    <div data-wp-bind--hidden="context.rsvpSubmitted">
                        <?php if (! $rsvp['closed'] && ! $rsvp['is_full']) : ?>
                            <div class="lfuf-event-card__rsvp-form">
                                <input
                                    type="text"
                                    class="lfuf-event-card__rsvp-input"
                                    placeholder="<?php esc_attr_e('Your name', 'leftfield-farm'); ?>"
                                    data-wp-on--input="actions.updateRsvpName"
                                    data-wp-bind--value="context.rsvpName"
                                    required
                                >
                                <input
                                    type="number"
                                    class="lfuf-event-card__rsvp-size"
                                    min="1"
                                    max="10"
                                    data-wp-on--input="actions.updateRsvpSize"
                                    data-wp-bind--value="context.rsvpSize"
                                    title="<?php esc_attr_e('Party size', 'leftfield-farm'); ?>"
                                >
                                <button
                                    type="button"
                                    class="lfuf-event-card__rsvp-btn"
                                    data-wp-on--click="actions.submitRsvp"
                                    data-wp-bind--disabled="context.submitting"
                                    data-wp-text="state.rsvpButtonText"
                                ><?php echo esc_html(
                                    get_post_meta($id, '_lfuf_em_rsvp_label', true) ?: __("I'm coming!", 'leftfield-farm')
                                ); ?></button>
                            </div>
                            <p class="lfuf-event-card__rsvp-error"
                               data-wp-text="context.rsvpError"
                               data-wp-bind--hidden="!context.rsvpError"></p>
                        <?php elseif ($rsvp['is_full']) : ?>
                            <p class="lfuf-event-card__rsvp-full">
                                <?php esc_html_e('This event is full!', 'leftfield-farm'); ?>
                            </p>
                        <?php else : ?>
                            <p class="lfuf-event-card__rsvp-closed">
                                <?php esc_html_e('RSVPs are closed.', 'leftfield-farm'); ?>
                            </p>
                        <?php endif; ?>
                    </div>

                    <div data-wp-bind--hidden="!context.rsvpSubmitted">
                        <p class="lfuf-event-card__rsvp-success" data-wp-text="context.rsvpMessage"></p>
                        <button
                            type="button"
                            class="lfuf-event-card__rsvp-cancel-btn"
                            data-wp-on--click="actions.cancelRsvp"
                        ><?php esc_html_e('Cancel my RSVP', 'leftfield-farm'); ?></button>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </article>
    <?php
    return ob_get_clean();
}
