<?php
/**
 * Server-side render for lfuf/event-list.
 *
 * Renders upcoming events with Interactivity API directives
 * for type filtering and inline RSVP form submission.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$show_past         = (bool) ($attributes['showPastEvents'] ?? false);
$per_page          = (int) ($attributes['perPage'] ?? 10);
$show_images       = (bool) ($attributes['showImages'] ?? true);
$show_rsvp         = (bool) ($attributes['showRsvp'] ?? true);
$show_location     = (bool) ($attributes['showLocation'] ?? true);
$show_type_filters = (bool) ($attributes['showTypeFilters'] ?? true);
$empty_message     = $attributes['emptyMessage'] ?? __('No upcoming events right now — check back soon!', 'leftfield-farm');

// Fetch upcoming events.
$request = new \WP_REST_Request('GET', '/lfuf/v1/events/upcoming');
$request->set_param('per_page', $per_page);
$response = \Leftfield\EventManager\REST\get_upcoming_events($request);
$upcoming = $response->get_data();

// Fetch past events if enabled.
$past = [];
if ($show_past) {
    $past_request = new \WP_REST_Request('GET', '/lfuf/v1/events/past');
    $past_request->set_param('per_page', $per_page);
    $past_response = \Leftfield\EventManager\REST\get_past_events($past_request);
    $past = $past_response->get_data();
}

// Collect event type terms for filters.
$all_types = get_terms([
    'taxonomy'   => 'lfuf_event_type',
    'hide_empty' => true,
]);
$filter_types = [];
if ($all_types && ! is_wp_error($all_types)) {
    foreach ($all_types as $term) {
        $filter_types[] = [
            'slug'  => $term->slug,
            'label' => $term->name,
        ];
    }
}

$has_events = ! empty($upcoming) || ! empty($past);

// Interactivity API context.
$context = [
    'activeTypeFilter' => '',
    'showPast'         => $show_past,
    'restBase'         => esc_url_raw(rest_url('lfuf/v1')),
];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-event-list',
]);
?>

<div
    <?php echo $wrapper_attrs; ?>
    data-wp-interactive="leftfield/event-list"
    <?php echo wp_interactivity_data_wp_context($context); ?>
>
    <?php if (! $has_events) : ?>
        <p class="lfuf-event-list__empty"><?php echo esc_html($empty_message); ?></p>
    <?php else : ?>

        <!-- ── Type filters ── -->
        <?php if ($show_type_filters && count($filter_types) > 1) : ?>
            <div class="lfuf-event-list__filters">
                <button
                    type="button"
                    class="lfuf-event-list__filter-btn"
                    data-wp-on--click="actions.setTypeFilter"
                    data-wp-class--lfuf-event-list__filter-btn--active="!context.activeTypeFilter"
                    data-type-slug=""
                ><?php esc_html_e('All Events', 'leftfield-farm'); ?></button>
                <?php foreach ($filter_types as $ft) : ?>
                    <button
                        type="button"
                        class="lfuf-event-list__filter-btn"
                        data-wp-on--click="actions.setTypeFilter"
                        data-type-slug="<?php echo esc_attr($ft['slug']); ?>"
                    ><?php echo esc_html($ft['label']); ?></button>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <!-- ── Upcoming events ── -->
        <?php if (! empty($upcoming)) : ?>
            <div class="lfuf-event-list__section">
                <h3 class="lfuf-event-list__section-title"><?php esc_html_e('Upcoming', 'leftfield-farm'); ?></h3>
                <?php foreach ($upcoming as $event) :
                    echo render_event_card($event, $show_images, $show_rsvp, $show_location);
                endforeach; ?>
            </div>
        <?php endif; ?>

        <!-- ── Past events ── -->
        <?php if ($show_past && ! empty($past)) : ?>
            <div class="lfuf-event-list__section lfuf-event-list__section--past">
                <h3 class="lfuf-event-list__section-title"><?php esc_html_e('Past Events', 'leftfield-farm'); ?></h3>
                <?php foreach ($past as $event) :
                    echo render_event_card($event, $show_images, false, $show_location);
                endforeach; ?>
            </div>
        <?php endif; ?>

    <?php endif; ?>
</div>

<?php
/**
 * Render a single event card.
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
        'eventId'      => $id,
        'rsvpName'     => '',
        'rsvpEmail'    => '',
        'rsvpSize'     => 1,
        'rsvpNote'     => '',
        'rsvpSubmitted' => false,
        'rsvpMessage'  => '',
        'rsvpToken'    => '',
        'rsvpError'    => '',
        'submitting'   => false,
        'headcount'    => $rsvp ? (int) $rsvp['headcount'] : 0,
        'spotsLeft'    => $rsvp ? $rsvp['spots_left'] : null,
        'isFull'       => $rsvp ? (bool) $rsvp['is_full'] : false,
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
            <!-- Header -->
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

            <!-- Date & time -->
            <?php if ($date_str) : ?>
                <p class="lfuf-event-card__datetime">
                    <span class="lfuf-event-card__date"><?php echo esc_html($date_str); ?></span>
                    <?php if ($time_str) : ?>
                        <span class="lfuf-event-card__time"><?php echo esc_html($time_str); ?></span>
                    <?php endif; ?>
                </p>
            <?php endif; ?>

            <!-- Location -->
            <?php if ($show_location && $event['location']) : ?>
                <p class="lfuf-event-card__location">
                    📍 <?php echo esc_html($event['location']['title']); ?>
                    <?php if ($event['location']['address']) : ?>
                        <span class="lfuf-event-card__address">— <?php echo esc_html($event['location']['address']); ?></span>
                    <?php endif; ?>
                </p>
            <?php endif; ?>

            <!-- Excerpt -->
            <?php if ($event['excerpt']) : ?>
                <p class="lfuf-event-card__excerpt"><?php echo esc_html($event['excerpt']); ?></p>
            <?php endif; ?>

            <!-- Details row -->
            <div class="lfuf-event-card__details">
                <?php if ($event['cost_note']) : ?>
                    <span class="lfuf-event-card__cost">💸 <?php echo esc_html($event['cost_note']); ?></span>
                <?php endif; ?>
                <?php if ($event['what_to_bring']) : ?>
                    <span class="lfuf-event-card__bring">🧺 <?php echo esc_html($event['what_to_bring']); ?></span>
                <?php endif; ?>
            </div>

            <!-- Donation link -->
            <?php if ($event['donation_link'] && ! $cancelled) : ?>
                <a class="lfuf-event-card__donate-link"
                   href="<?php echo esc_url($event['donation_link']); ?>"
                   target="_blank"
                   rel="noopener noreferrer">
                    <?php esc_html_e('Donate / Pay', 'leftfield-farm'); ?>
                </a>
            <?php endif; ?>

            <!-- RSVP section -->
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

                    <!-- RSVP form (hidden after submission) -->
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

                    <!-- Success message (shown after submission) -->
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
