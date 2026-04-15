<?php
/**
 * Server-side render for lfuf/stand-hours-schedule.
 *
 * Renders a weekly schedule grid from the location's
 * _lfuf_ss_schedule meta. Highlights today if enabled.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$location_id    = (int) ($attributes['locationId'] ?? 0);
$highlight_today = (bool) ($attributes['highlightToday'] ?? true);

if ($location_id < 1) {
    return;
}

$post = get_post($location_id);
if (! $post || $post->post_type !== 'lfuf_location' || $post->post_status !== 'publish') {
    return;
}

$schedule_json = get_post_meta($location_id, '_lfuf_ss_schedule', true);
$schedule      = $schedule_json ? json_decode($schedule_json, true) : [];
$hours_fallback = get_post_meta($location_id, '_lfuf_hours', true);

// Index schedule by day number.
$by_day = [];
if (is_array($schedule)) {
    foreach ($schedule as $entry) {
        $day = (int) ($entry['day'] ?? -1);
        if ($day >= 0 && $day <= 6) {
            $by_day[$day][] = $entry;
        }
    }
}

$today     = (int) current_datetime()->format('w');
$day_names = [
    0 => __('Sunday', 'leftfield-stand-status'),
    1 => __('Monday', 'leftfield-stand-status'),
    2 => __('Tuesday', 'leftfield-stand-status'),
    3 => __('Wednesday', 'leftfield-stand-status'),
    4 => __('Thursday', 'leftfield-stand-status'),
    5 => __('Friday', 'leftfield-stand-status'),
    6 => __('Saturday', 'leftfield-stand-status'),
];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-stand-schedule',
]);
?>

<div <?php echo $wrapper_attrs; ?>>
    <?php if (empty($by_day)) : ?>
        <?php if ($hours_fallback) : ?>
            <p class="lfuf-stand-schedule__fallback">
                <span class="lfuf-stand-banner__icon" aria-hidden="true">🕐</span>
                <?php echo esc_html($hours_fallback); ?>
            </p>
        <?php else : ?>
            <p class="lfuf-stand-schedule__empty">
                <?php esc_html_e('No schedule set yet.', 'leftfield-stand-status'); ?>
            </p>
        <?php endif; ?>
    <?php else : ?>
        <div class="lfuf-stand-schedule__grid">
            <?php for ($d = 0; $d <= 6; $d++) :
                $is_today  = $highlight_today && $d === $today;
                $has_hours = isset($by_day[$d]);
                $classes   = 'lfuf-stand-schedule__day';
                if ($is_today) {
                    $classes .= ' lfuf-stand-schedule__day--today';
                }
                if (! $has_hours) {
                    $classes .= ' lfuf-stand-schedule__day--closed';
                }
            ?>
                <div class="<?php echo esc_attr($classes); ?>">
                    <span class="lfuf-stand-schedule__day-label">
                        <?php echo esc_html($day_names[$d]); ?>
                        <?php if ($is_today) : ?>
                            <span class="lfuf-stand-schedule__today-badge">
                                <?php esc_html_e('Today', 'leftfield-stand-status'); ?>
                            </span>
                        <?php endif; ?>
                    </span>
                    <span class="lfuf-stand-schedule__day-hours">
                        <?php if ($has_hours) :
                            $time_strings = array_map(function ($e) {
                                $open  = date_i18n('g:i A', strtotime('2000-01-01 ' . ($e['open'] ?? '00:00')));
                                $close = date_i18n('g:i A', strtotime('2000-01-01 ' . ($e['close'] ?? '23:59')));
                                return $open . ' – ' . $close;
                            }, $by_day[$d]);
                            echo esc_html(implode(', ', $time_strings));
                        else : ?>
                            <?php esc_html_e('Closed', 'leftfield-stand-status'); ?>
                        <?php endif; ?>
                    </span>
                </div>
            <?php endfor; ?>
        </div>
    <?php endif; ?>
</div>
