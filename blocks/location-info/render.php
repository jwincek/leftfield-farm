<?php
/**
 * Server-side render for lfuf/location-info.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$location_id = (int) ($attributes['locationId'] ?? 0);
$show_venmo  = (bool) ($attributes['showVenmo'] ?? true);
$show_status = (bool) ($attributes['showStatus'] ?? true);

if ($location_id < 1) {
    return;
}

$location = get_post($location_id);

if (! $location || $location->post_type !== 'lfuf_location' || $location->post_status !== 'publish') {
    return;
}

$address       = get_post_meta($location_id, '_lfuf_address', true);
$location_type = get_post_meta($location_id, '_lfuf_location_type', true);
$venmo_handle  = get_post_meta($location_id, '_lfuf_venmo_handle', true);
$hours         = get_post_meta($location_id, '_lfuf_hours', true);
$is_open       = (bool) get_post_meta($location_id, '_lfuf_is_open', true);

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-location-info',
]);
?>

<div <?php echo $wrapper_attrs; ?>>
    <div class="lfuf-location-info__header">
        <h3 class="lfuf-location-info__title">
            <?php echo esc_html($location->post_title); ?>
        </h3>

        <?php if ($show_status) : ?>
            <span class="lfuf-location-info__status lfuf-location-info__status--<?php echo $is_open ? 'open' : 'closed'; ?>">
                <?php echo $is_open ? esc_html__('Open Now', 'leftfield-core') : esc_html__('Closed', 'leftfield-core'); ?>
            </span>
        <?php endif; ?>
    </div>

    <?php if ($location_type) : ?>
        <span class="lfuf-location-info__type">
            <?php echo esc_html(ucfirst($location_type)); ?>
        </span>
    <?php endif; ?>

    <?php if ($address) : ?>
        <p class="lfuf-location-info__address"><?php echo esc_html($address); ?></p>
    <?php endif; ?>

    <?php if ($hours) : ?>
        <p class="lfuf-location-info__hours"><?php echo esc_html($hours); ?></p>
    <?php endif; ?>

    <?php if ($show_venmo && $venmo_handle) : ?>
        <a
            class="lfuf-location-info__venmo"
            href="<?php echo esc_url('https://venmo.com/' . ltrim($venmo_handle, '@')); ?>"
            target="_blank"
            rel="noopener noreferrer"
        >
            <?php printf(esc_html__('Pay via Venmo (@%s)', 'leftfield-core'), esc_html(ltrim($venmo_handle, '@'))); ?>
        </a>
    <?php endif; ?>
</div>
