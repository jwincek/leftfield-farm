<?php
/**
 * Server-side render for lfuf/availability-board.
 *
 * Fix: Groups and items are ALWAYS rendered visible in the initial HTML.
 * The Interactivity API handles show/hide client-side after hydration.
 * This avoids SSR issues where getElement() returns null.
 *
 * Fix: Filter buttons and groups use per-element data-wp-context to pass
 * slugs, avoiding hyphenated property names in state getters.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$show_filters        = (bool) ($attributes['showFilters'] ?? true);
$show_images         = (bool) ($attributes['showImages'] ?? true);
$show_prices         = (bool) ($attributes['showPrices'] ?? true);
$show_quantity_notes = (bool) ($attributes['showQuantityNotes'] ?? true);
$default_status      = $attributes['defaultStatusFilter'] ?? 'abundant,available,limited';
$location_id         = (int) ($attributes['locationId'] ?? 0);
$layout              = $attributes['layout'] ?? 'grid';
$empty_message       = $attributes['emptyMessage'] ?? __('Check back soon — we\'re updating what\'s available this week!', 'leftfield-farm');

// Build the board data.
$request = new \WP_REST_Request('GET', '/lfuf/v1/board');
$request->set_param('location', $location_id);
$response = \Leftfield\AvailabilityBoard\REST\get_board($request);
$board    = $response->get_data();

$groups       = $board['groups'] ?? [];
$filter_types = $board['filter_types'] ?? [];
$statuses     = $board['statuses'] ?? [];
$total        = $board['total_items'] ?? 0;

$active_statuses = array_filter(array_map('trim', explode(',', $default_status)));

// Root context — shared board state.
$context = [
    'activeStatuses'   => $active_statuses,
    'activeType'       => '',
    'totalItems'       => $total,
    'layout'           => $layout,
    'restBase'         => esc_url_raw(rest_url('lfuf/v1')),
];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-avail-board lfuf-avail-board--' . esc_attr($layout),
]);
?>

<section
    <?php echo $wrapper_attrs; ?>
    aria-label="<?php esc_attr_e('Product Availability', 'leftfield-farm'); ?>"
    data-wp-interactive="leftfield/availability-board"
    <?php echo wp_interactivity_data_wp_context($context); ?>
    data-wp-init="callbacks.initBoard"
>
    <?php if ($total === 0) : ?>
        <p class="lfuf-avail-board__empty">
            <?php echo esc_html($empty_message); ?>
        </p>
    <?php else : ?>

        <!-- ── Filters ── -->
        <?php if ($show_filters) : ?>
            <div class="lfuf-avail-board__filters">
                <div
                    class="lfuf-avail-board__filter-group"
                    role="toolbar"
                    aria-label="<?php esc_attr_e('Filter by availability status', 'leftfield-farm'); ?>"
                >
                    <span class="lfuf-avail-board__filter-label">
                        <?php esc_html_e('Show:', 'leftfield-farm'); ?>
                    </span>
                    <?php foreach ($statuses as $status) :
                        $is_active = in_array($status, $active_statuses, true);
                    ?>
                        <button
                            type="button"
                            class="lfuf-avail-board__filter-btn lfuf-availability-badge lfuf-availability-badge--<?php echo esc_attr($status); ?><?php echo $is_active ? ' lfuf-avail-board__filter-btn--active' : ''; ?>"
                            data-wp-on--click="actions.toggleStatus"
                            data-wp-context='<?php echo esc_attr(wp_json_encode(['filterStatus' => $status])); ?>'
                            data-wp-class--lfuf-avail-board__filter-btn--active="state.isCurrentStatusActive"
                            data-wp-bind--aria-pressed="state.isCurrentStatusActive"
                            data-status="<?php echo esc_attr($status); ?>"
                            aria-pressed="<?php echo $is_active ? 'true' : 'false'; ?>"
                        ><?php echo esc_html(ucfirst(str_replace('_', ' ', $status))); ?></button>
                    <?php endforeach; ?>
                </div>

                <?php if (count($filter_types) > 1) : ?>
                    <div
                        class="lfuf-avail-board__filter-group"
                        role="toolbar"
                        aria-label="<?php esc_attr_e('Filter by product type', 'leftfield-farm'); ?>"
                    >
                        <span class="lfuf-avail-board__filter-label">
                            <?php esc_html_e('Type:', 'leftfield-farm'); ?>
                        </span>
                        <button
                            type="button"
                            class="lfuf-avail-board__filter-btn lfuf-avail-board__filter-btn--active"
                            data-wp-on--click="actions.setTypeFilter"
                            data-wp-context='<?php echo esc_attr(wp_json_encode(['filterType' => ''])); ?>'
                            data-wp-class--lfuf-avail-board__filter-btn--active="state.isCurrentTypeActive"
                            data-wp-bind--aria-pressed="state.isCurrentTypeActive"
                            data-type-slug=""
                            aria-pressed="true"
                        ><?php esc_html_e('All', 'leftfield-farm'); ?></button>
                        <?php foreach ($filter_types as $ft) : ?>
                            <button
                                type="button"
                                class="lfuf-avail-board__filter-btn"
                                data-wp-on--click="actions.setTypeFilter"
                                data-wp-context='<?php echo esc_attr(wp_json_encode(['filterType' => $ft['slug']])); ?>'
                                data-wp-class--lfuf-avail-board__filter-btn--active="state.isCurrentTypeActive"
                                data-wp-bind--aria-pressed="state.isCurrentTypeActive"
                                data-type-slug="<?php echo esc_attr($ft['slug']); ?>"
                                aria-pressed="false"
                            ><?php echo esc_html($ft['label']); ?></button>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <!-- ── Board groups ── -->
        <?php foreach ($groups as $group) : ?>
            <div
                class="lfuf-avail-board__group"
                data-type-slug="<?php echo esc_attr($group['slug']); ?>"
                data-wp-context='<?php echo esc_attr(wp_json_encode(['groupSlug' => $group['slug']])); ?>'
                data-wp-bind--hidden="state.isCurrentGroupHidden"
            >
                <h3 class="lfuf-avail-board__group-title">
                    <?php echo esc_html($group['label']); ?>
                    <span
                        class="lfuf-avail-board__group-count"
                        aria-hidden="true"
                        data-wp-text="state.currentGroupCount"
                    ><?php echo count($group['items']); ?></span>
                </h3>

                <div class="lfuf-avail-board__items lfuf-avail-board__items--<?php echo esc_attr($layout); ?>">
                    <?php foreach ($group['items'] as $item) :
                        $status_text = ucfirst(str_replace('_', ' ', $item['status']));
                        $aria_parts = [$item['product_name'], $status_text];
                        if ($show_prices && $item['price']) {
                            $price_str = $item['price'];
                            if ($item['unit']) {
                                $price_str .= '/' . $item['unit'];
                            }
                            $aria_parts[] = $price_str;
                        }
                        if ($show_quantity_notes && $item['quantity_note']) {
                            $aria_parts[] = $item['quantity_note'];
                        }
                        $item_aria_label = implode(' — ', $aria_parts);

                        // Per-item context with its status and type for filtering.
                        $item_context = [
                            'itemStatus' => $item['status'],
                            'itemType'   => $item['product_slugs'][0] ?? '',
                        ];
                    ?>
                        <article
                            class="lfuf-avail-board__item"
                            data-status="<?php echo esc_attr($item['status']); ?>"
                            data-type-slug="<?php echo esc_attr($item['product_slugs'][0] ?? ''); ?>"
                            data-wp-context='<?php echo esc_attr(wp_json_encode($item_context)); ?>'
                            data-wp-bind--hidden="state.isCurrentItemHidden"
                            data-product-id="<?php echo (int) $item['product_id']; ?>"
                            aria-label="<?php echo esc_attr($item_aria_label); ?>"
                        >
                            <?php if ($show_images && $item['thumbnail_url']) : ?>
                                <div class="lfuf-avail-board__item-image">
                                    <img
                                        src="<?php echo esc_url($item['thumbnail_url']); ?>"
                                        alt=""
                                        loading="lazy"
                                        width="80"
                                        height="80"
                                    >
                                </div>
                            <?php endif; ?>

                            <div class="lfuf-avail-board__item-body">
                                <div class="lfuf-avail-board__item-header">
                                    <a href="<?php echo esc_url($item['permalink']); ?>" class="lfuf-avail-board__item-name">
                                        <?php echo esc_html($item['product_name']); ?>
                                    </a>
                                    <span class="lfuf-availability-badge lfuf-availability-badge--<?php echo esc_attr($item['status']); ?>">
                                        <?php echo esc_html($status_text); ?>
                                    </span>
                                </div>

                                <?php if ($show_prices && $item['price']) : ?>
                                    <span class="lfuf-avail-board__item-price">
                                        <span class="screen-reader-text"><?php esc_html_e('Price:', 'leftfield-farm'); ?> </span>
                                        <?php echo esc_html($item['price']); ?>
                                        <?php if ($item['unit']) : ?>
                                            <span class="lfuf-avail-board__item-unit">/ <?php echo esc_html($item['unit']); ?></span>
                                        <?php endif; ?>
                                    </span>
                                <?php endif; ?>

                                <?php if ($show_quantity_notes && $item['quantity_note']) : ?>
                                    <span class="lfuf-avail-board__item-note">
                                        <?php echo esc_html($item['quantity_note']); ?>
                                    </span>
                                <?php endif; ?>

                                <?php if ($item['seasons']) : ?>
                                    <div class="lfuf-avail-board__item-seasons" aria-label="<?php esc_attr_e('Available seasons', 'leftfield-farm'); ?>">
                                        <?php foreach ($item['seasons'] as $season) : ?>
                                            <span class="lfuf-avail-board__season-tag"><?php echo esc_html($season); ?></span>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>

        <!-- ── Board footer ── -->
        <p class="lfuf-avail-board__footer" aria-live="polite" aria-atomic="true">
            <span data-wp-text="state.footerText">
                <?php printf(
                    esc_html__('Showing %d items', 'leftfield-farm'),
                    $total,
                ); ?>
            </span>
            <?php if ($board['generated_at'] ?? false) : ?>
                <span class="lfuf-avail-board__timestamp">
                    <span class="screen-reader-text"><?php esc_html_e('Last updated:', 'leftfield-farm'); ?> </span>
                    <?php echo esc_html(date_i18n('M j, g:i A', strtotime($board['generated_at']))); ?>
                </span>
            <?php endif; ?>
        </p>

    <?php endif; ?>
</section>