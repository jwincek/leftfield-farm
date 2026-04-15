<?php
/**
 * Server-side render for lfuf/event-card.
 *
 * Renders a single event using the same card markup as the event list.
 * Reuses the REST build_event_data helper for consistency.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$event_id      = (int) ($attributes['eventId'] ?? 0);
$show_image    = (bool) ($attributes['showImage'] ?? true);
$show_rsvp     = (bool) ($attributes['showRsvp'] ?? true);
$show_location = (bool) ($attributes['showLocation'] ?? true);

if ($event_id < 1) {
    return;
}

$event_post = get_post($event_id);
if (! $event_post || $event_post->post_type !== 'lfuf_event' || $event_post->post_status !== 'publish') {
    return;
}

// Build event data using the shared helper.
$event_data = \Leftfield\EventManager\REST\build_event_data($event_post);

$context = [
    'activeTypeFilter' => '',
    'restBase'         => esc_url_raw(rest_url('lfuf/v1')),
];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-event-card-wrapper',
]);
?>

<div
    <?php echo $wrapper_attrs; ?>
    data-wp-interactive="leftfield/event-list"
    <?php echo wp_interactivity_data_wp_context($context); ?>
>
    <?php
    // Reuse the event list's render function if available,
    // otherwise render a simplified version.
    if (function_exists('Leftfield\\EventManager\\Blocks\\render_event_card')) {
        // If the event-list block's render.php has been loaded, reuse it.
        echo \Leftfield\EventManager\Blocks\render_event_card($event_data, $show_image, $show_rsvp, $show_location);
    } else {
        // Load the render function from the event-list block.
        $event_list_render = dirname(__DIR__) . '/event-list/render.php';
        if (file_exists($event_list_render)) {
            // The render_event_card function is defined in event-list/render.php's namespace scope.
            // We need to call it from the global scope after it's been required.
            // Since render.php files are loaded per-block, we inline a simplified card here.
        }

        // Simplified single-card render.
        $cancelled = (bool) $event_data['cancelled'];
        $start_ts  = $event_data['start'] ? strtotime($event_data['start']) : 0;
        $end_ts    = $event_data['end'] ? strtotime($event_data['end']) : 0;
        $date_str  = $start_ts ? date_i18n('l, F j', $start_ts) : '';
        $time_str  = $start_ts ? date_i18n('g:i A', $start_ts) : '';
        if ($end_ts) {
            $time_str .= ' – ' . date_i18n('g:i A', $end_ts);
        }

        $rsvp = $event_data['rsvp'];
        $rsvp_context = wp_json_encode([
            'eventId'       => $event_id,
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
        ?>
        <article
            class="lfuf-event-card<?php echo $cancelled ? ' lfuf-event-card--cancelled' : ''; ?>"
            data-wp-context='<?php echo esc_attr($rsvp_context); ?>'
        >
            <?php if ($show_image && $event_data['thumbnail_url']) : ?>
                <div class="lfuf-event-card__image">
                    <img src="<?php echo esc_url($event_data['thumbnail_url']); ?>"
                         alt="<?php echo esc_attr($event_data['title']); ?>"
                         loading="lazy">
                </div>
            <?php endif; ?>

            <div class="lfuf-event-card__body">
                <?php if ($event_data['event_types']) : ?>
                    <span class="lfuf-event-card__type-badge">
                        <?php echo esc_html($event_data['event_types'][0]); ?>
                    </span>
                <?php endif; ?>

                <?php if ($cancelled) : ?>
                    <span class="lfuf-event-card__cancelled-badge">
                        <?php esc_html_e('Cancelled', 'leftfield-farm'); ?>
                    </span>
                <?php endif; ?>

                <h4 class="lfuf-event-card__title">
                    <a href="<?php echo esc_url($event_data['permalink']); ?>">
                        <?php echo esc_html($event_data['title']); ?>
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

                <?php if ($show_location && $event_data['location']) : ?>
                    <p class="lfuf-event-card__location">
                        📍 <?php echo esc_html($event_data['location']['title']); ?>
                    </p>
                <?php endif; ?>

                <?php if ($event_data['excerpt']) : ?>
                    <p class="lfuf-event-card__excerpt"><?php echo esc_html($event_data['excerpt']); ?></p>
                <?php endif; ?>

                <?php if ($event_data['cost_note'] || $event_data['what_to_bring']) : ?>
                    <div class="lfuf-event-card__details">
                        <?php if ($event_data['cost_note']) : ?>
                            <span class="lfuf-event-card__cost">💸 <?php echo esc_html($event_data['cost_note']); ?></span>
                        <?php endif; ?>
                        <?php if ($event_data['what_to_bring']) : ?>
                            <span class="lfuf-event-card__bring">🧺 <?php echo esc_html($event_data['what_to_bring']); ?></span>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>

                <?php if ($event_data['donation_link'] && ! $cancelled) : ?>
                    <a class="lfuf-event-card__donate-link"
                       href="<?php echo esc_url($event_data['donation_link']); ?>"
                       target="_blank" rel="noopener noreferrer">
                        <?php esc_html_e('Donate / Pay', 'leftfield-farm'); ?>
                    </a>
                <?php endif; ?>

                <?php if ($show_rsvp && $rsvp && $rsvp['enabled'] && ! $cancelled) : ?>
                    <div class="lfuf-event-card__rsvp">
                        <div class="lfuf-event-card__rsvp-summary">
                            <span data-wp-text="state.rsvpSummaryText">
                                <?php printf(esc_html__('%d people coming', 'leftfield-farm'), (int) $rsvp['headcount']); ?>
                            </span>
                        </div>
                        <div data-wp-bind--hidden="context.rsvpSubmitted">
                            <?php if (! $rsvp['closed'] && ! $rsvp['is_full']) : ?>
                                <div class="lfuf-event-card__rsvp-form">
                                    <input type="text" class="lfuf-event-card__rsvp-input"
                                           placeholder="<?php esc_attr_e('Your name', 'leftfield-farm'); ?>"
                                           data-wp-on--input="actions.updateRsvpName"
                                           data-wp-bind--value="context.rsvpName" required>
                                    <input type="number" class="lfuf-event-card__rsvp-size"
                                           min="1" max="10"
                                           data-wp-on--input="actions.updateRsvpSize"
                                           data-wp-bind--value="context.rsvpSize">
                                    <button type="button" class="lfuf-event-card__rsvp-btn"
                                            data-wp-on--click="actions.submitRsvp"
                                            data-wp-bind--disabled="context.submitting"
                                            data-wp-text="state.rsvpButtonText">
                                        <?php esc_html_e("I'm coming!", 'leftfield-farm'); ?>
                                    </button>
                                </div>
                                <p class="lfuf-event-card__rsvp-error"
                                   data-wp-text="context.rsvpError"
                                   data-wp-bind--hidden="!context.rsvpError"></p>
                            <?php endif; ?>
                        </div>
                        <div data-wp-bind--hidden="!context.rsvpSubmitted">
                            <p class="lfuf-event-card__rsvp-success" data-wp-text="context.rsvpMessage"></p>
                            <button type="button" class="lfuf-event-card__rsvp-cancel-btn"
                                    data-wp-on--click="actions.cancelRsvp">
                                <?php esc_html_e('Cancel my RSVP', 'leftfield-farm'); ?>
                            </button>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </article>
        <?php
    }
    ?>
</div>
