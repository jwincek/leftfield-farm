<?php
/**
 * Server-side render for lfuf/stand-status-banner.
 *
 * Uses the WordPress Interactivity API (6.5+) for reactive front-end updates.
 * The server renders the initial HTML with full content (SSR-first), then
 * the view.js module hydrates the store and handles polling via the
 * Interactivity API's reactive state system.
 *
 * Directives used:
 *   data-wp-interactive  — declares the interactive namespace
 *   data-wp-context      — passes server state to the client store
 *   data-wp-class--*     — reactive CSS class toggling
 *   data-wp-text          — reactive text content
 *   data-wp-bind--hidden  — reactive visibility
 *   data-wp-init          — triggers polling setup on hydration
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$location_id     = (int) ($attributes['locationId'] ?? 0);
$show_address     = (bool) ($attributes['showAddress'] ?? true);
$show_hours       = (bool) ($attributes['showHours'] ?? true);
$show_venmo       = (bool) ($attributes['showVenmo'] ?? true);
$show_season      = (bool) ($attributes['showSeasonDates'] ?? true);
$layout           = $attributes['layout'] ?? 'banner';
$polling_enabled  = (bool) ($attributes['pollingEnabled'] ?? false);

if ($location_id < 1) {
    return;
}

$post = get_post($location_id);
if (! $post || $post->post_type !== 'lfuf_location' || $post->post_status !== 'publish') {
    return;
}

// Gather all meta.
$is_open        = (bool) get_post_meta($location_id, '_lfuf_is_open', true);
$address        = get_post_meta($location_id, '_lfuf_address', true);
$hours          = get_post_meta($location_id, '_lfuf_hours', true);
$venmo_handle   = get_post_meta($location_id, '_lfuf_venmo_handle', true);
$status_message = get_post_meta($location_id, '_lfuf_ss_status_message', true);
$last_toggled   = get_post_meta($location_id, '_lfuf_ss_last_toggled', true);
$season_start   = get_post_meta($location_id, '_lfuf_ss_season_start', true);
$season_end     = get_post_meta($location_id, '_lfuf_ss_season_end', true);
$auto_toggle    = (bool) get_post_meta($location_id, '_lfuf_ss_auto_toggle', true);
$schedule       = get_post_meta($location_id, '_lfuf_ss_schedule', true);

// Compute effective status.
if ($auto_toggle && $schedule) {
    $is_open = \Leftfield\StandStatus\REST\compute_schedule_status($schedule);
}
if ($season_start && $season_end) {
    $in_season = \Leftfield\StandStatus\REST\is_in_season($season_start, $season_end);
    if (! $in_season) {
        $is_open = false;
    }
} else {
    $in_season = true;
}

$status_slug  = $is_open ? 'open' : 'closed';
$status_label = $is_open
    ? __('Open Now', 'leftfield-stand-status')
    : __('Closed', 'leftfield-stand-status');

// Format "last updated" as relative time.
$time_ago = '';
if ($last_toggled) {
    $toggled_ts = strtotime($last_toggled);
    if ($toggled_ts) {
        $time_ago = human_time_diff($toggled_ts, current_time('timestamp')) . ' ' . __('ago', 'leftfield-stand-status');
    }
}

// Next scheduled opening.
$next_open = '';
if (! $is_open && $schedule) {
    $next_open = \Leftfield\StandStatus\REST\compute_next_open($schedule);
}

// Venmo URL.
$venmo_url = $venmo_handle
    ? 'https://venmo.com/' . ltrim($venmo_handle, '@')
    : '';

// Season display strings.
$season_range_full = ($season_start && $season_end)
    ? sprintf(
        __('Our season runs %s – %s. See you then!', 'leftfield-stand-status'),
        date_i18n('F j', strtotime($season_start)),
        date_i18n('F j', strtotime($season_end)),
    )
    : '';

$season_range_short = ($season_start && $season_end)
    ? sprintf(
        __('Season: %s – %s', 'leftfield-stand-status'),
        date_i18n('M j', strtotime($season_start)),
        date_i18n('M j', strtotime($season_end)),
    )
    : '';

/**
 * Build the Interactivity API context.
 *
 * This is the initial state passed to the client-side store.
 * The view.js module reads and reactively updates these values.
 */
$context = [
    'locationId'      => $location_id,
    'isOpen'          => $is_open,
    'inSeason'        => $in_season,
    'statusLabel'     => $status_label,
    'statusMessage'   => $status_message ?: '',
    'nextOpen'        => $next_open,
    'timeAgo'         => $time_ago,
    'pollingEnabled'  => $polling_enabled,
    'restBase'        => esc_url_raw(rest_url('lfuf/v1')),
];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-stand-banner lfuf-stand-banner--' . esc_attr($layout) . ' lfuf-stand-banner--' . $status_slug,
]);
?>

<div
    <?php echo $wrapper_attrs; ?>
    data-wp-interactive="leftfield/stand-status"
    <?php echo wp_interactivity_data_wp_context($context); ?>
    data-wp-init="callbacks.initPolling"
    data-wp-class--lfuf-stand-banner--open="context.isOpen"
    data-wp-class--lfuf-stand-banner--closed="!context.isOpen"
>
    <div class="lfuf-stand-banner__main">
        <div class="lfuf-stand-banner__status-row">
            <span
                class="lfuf-stand-banner__indicator"
                aria-hidden="true"
                data-wp-class--lfuf-stand-banner__indicator--open="context.isOpen"
                data-wp-class--lfuf-stand-banner__indicator--closed="!context.isOpen"
            ></span>
            <span
                class="lfuf-stand-banner__status-label"
                data-wp-text="context.statusLabel"
            ><?php echo esc_html($status_label); ?></span>
        </div>

        <h3 class="lfuf-stand-banner__name"><?php echo esc_html($post->post_title); ?></h3>

        <p
            class="lfuf-stand-banner__message"
            data-wp-text="context.statusMessage"
            data-wp-bind--hidden="!context.statusMessage"
            <?php echo $status_message ? '' : 'hidden'; ?>
        ><?php echo esc_html($status_message); ?></p>

        <p
            class="lfuf-stand-banner__next-open"
            data-wp-text="state.nextOpenText"
            data-wp-bind--hidden="state.hideNextOpen"
            <?php echo (! $is_open && $next_open) ? '' : 'hidden'; ?>
        ><?php
            if (! $is_open && $next_open) {
                printf(esc_html__('Next open: %s', 'leftfield-stand-status'), esc_html($next_open));
            }
        ?></p>

        <?php if ($time_ago) : ?>
            <span
                class="lfuf-stand-banner__updated"
                data-wp-text="state.updatedText"
            ><?php printf(esc_html__('Updated %s', 'leftfield-stand-status'), esc_html($time_ago)); ?></span>
        <?php endif; ?>
    </div>

    <div class="lfuf-stand-banner__details">
        <?php if (! $in_season && $show_season && $season_range_full) : ?>
            <p class="lfuf-stand-banner__off-season">
                <?php echo esc_html($season_range_full); ?>
            </p>
        <?php endif; ?>

        <?php if ($in_season && $show_season && $season_range_short) : ?>
            <p class="lfuf-stand-banner__season-note">
                <?php echo esc_html($season_range_short); ?>
            </p>
        <?php endif; ?>

        <?php if ($show_address && $address) : ?>
            <p class="lfuf-stand-banner__address">
                <span class="lfuf-stand-banner__icon" aria-hidden="true">📍</span>
                <?php echo esc_html($address); ?>
            </p>
        <?php endif; ?>

        <?php if ($show_hours && $hours) : ?>
            <p class="lfuf-stand-banner__hours">
                <span class="lfuf-stand-banner__icon" aria-hidden="true">🕐</span>
                <?php echo esc_html($hours); ?>
            </p>
        <?php endif; ?>

        <?php if ($show_venmo && $venmo_url) : ?>
            <a class="lfuf-stand-banner__venmo-link"
               href="<?php echo esc_url($venmo_url); ?>"
               target="_blank"
               rel="noopener noreferrer">
                <span class="lfuf-stand-banner__icon" aria-hidden="true">💸</span>
                <?php
                printf(
                    esc_html__('Pay with Venmo (@%s)', 'leftfield-stand-status'),
                    esc_html(ltrim($venmo_handle, '@')),
                );
                ?>
            </a>
        <?php endif; ?>
    </div>
</div>


