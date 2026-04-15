<?php
/**
 * Server-side render for lfuf/availability-badge.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$product_id  = (int) ($attributes['productId'] ?? 0);
$location_id = (int) ($attributes['locationId'] ?? 0);

if ($product_id < 1) {
    return;
}

$rows = \Leftfield\Core\Availability\get_current($product_id, $location_id);

if (empty($rows)) {
    return;
}

// Use the most recent row.
$row = $rows[0];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-availability-badge-wrapper',
]);
?>

<span <?php echo $wrapper_attrs; ?>>
    <span class="lfuf-availability-badge lfuf-availability-badge--<?php echo esc_attr($row->status); ?>">
        <?php echo esc_html(ucfirst(str_replace('_', ' ', $row->status))); ?>
    </span>
    <?php if ($row->quantity_note) : ?>
        <span class="lfuf-availability-badge__note"><?php echo esc_html($row->quantity_note); ?></span>
    <?php endif; ?>
</span>
