<?php
/**
 * Server-side render for lfuf/availability-board.
 *
 * Fetches current board data, renders the full HTML with
 * Interactivity API directives for client-side filtering.
 * The server renders ALL items; the client hides/shows
 * based on active filters — no additional fetches needed
 * for filtering (progressive enhancement).
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

$show_filters       = (bool) ($attributes['showFilters'] ?? true);
$show_images        = (bool) ($attributes['showImages'] ?? true);
$show_prices        = (bool) ($attributes['showPrices'] ?? true);
$show_quantity_notes = (bool) ($attributes['showQuantityNotes'] ?? true);
$default_status     = $attributes['defaultStatusFilter'] ?? 'abundant,available,limited';
$location_id        = (int) ($attributes['locationId'] ?? 0);
$layout             = $attributes['layout'] ?? 'grid';
$empty_message      = $attributes['emptyMessage'] ?? __('Check back soon — we\'re updating what\'s available this week!', 'leftfield-farm');

// Build the board data using the same logic as the REST endpoint.
$request = new \WP_REST_Request('GET', '/lfuf/v1/board');
$request->set_param('location', $location_id);
$response = \Leftfield\AvailabilityBoard\REST\get_board($request);
$board    = $response->get_data();

$groups       = $board['groups'] ?? [];
$filter_types = $board['filter_types'] ?? [];
$statuses     = $board['statuses'] ?? [];
$total        = $board['total_items'] ?? 0;

// Parse default active statuses.
$active_statuses = array_filter(array_map('trim', explode(',', $default_status)));

// Build Interactivity API context.
$context = [
    'activeStatuses'   => $active_statuses,
    'activeType'       => '',
    'totalItems'       => $total,
    'visibleCount'     => $total,
    'showImages'       => $show_images,
    'showPrices'       => $show_prices,
    'showNotes'        => $show_quantity_notes,
    'layout'           => $layout,
    'restBase'         => esc_url_raw(rest_url('lfuf/v1')),
];

$wrapper_attrs = get_block_wrapper_attributes([
    'class' => 'lfuf-avail-board lfuf-avail-board--' . esc_attr($layout),
]);
?>

<div
    <?php echo $wrapper_attrs; ?>
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
                <div class="lfuf-avail-board__filter-group">
                    <span class="lfuf-avail-board__filter-label">
                        <?php esc_html_e('Show:', 'leftfield-farm'); ?>
                    </span>
                    <?php foreach ($statuses as $status) :
                        $is_active = in_array($status, $active_statuses, true);
                        $label     = ucfirst(str_replace('_', ' ', $status));
                    ?>
                        <button
                            type="button"
                            class="lfuf-avail-board__filter-btn lfuf-availability-badge lfuf-availability-badge--<?php echo esc_attr($status); ?>"
                            data-wp-on--click="actions.toggleStatus"
                            data-wp-class--lfuf-avail-board__filter-btn--active="state.isStatusActive_<?php echo esc_attr($status); ?>"
                            data-status="<?php echo esc_attr($status); ?>"
                            <?php echo $is_active ? '' : 'aria-pressed="false"'; ?>
                        ><?php echo esc_html($label); ?></button>
                    <?php endforeach; ?>
                </div>

                <?php if (count($filter_types) > 1) : ?>
                    <div class="lfuf-avail-board__filter-group">
                        <span class="lfuf-avail-board__filter-label">
                            <?php esc_html_e('Type:', 'leftfield-farm'); ?>
                        </span>
                        <button
                            type="button"
                            class="lfuf-avail-board__filter-btn"
                            data-wp-on--click="actions.setTypeFilter"
                            data-wp-class--lfuf-avail-board__filter-btn--active="!context.activeType"
                            data-type-slug=""
                        ><?php esc_html_e('All', 'leftfield-farm'); ?></button>
                        <?php foreach ($filter_types as $ft) : ?>
                            <button
                                type="button"
                                class="lfuf-avail-board__filter-btn"
                                data-wp-on--click="actions.setTypeFilter"
                                data-wp-class--lfuf-avail-board__filter-btn--active="state.isTypeActive_<?php echo esc_attr($ft['slug']); ?>"
                                data-type-slug="<?php echo esc_attr($ft['slug']); ?>"
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
                data-wp-bind--hidden="state.isGroupHidden_<?php echo esc_attr($group['slug']); ?>"
            >
                <h3 class="lfuf-avail-board__group-title">
                    <?php echo esc_html($group['label']); ?>
                    <span class="lfuf-avail-board__group-count" data-wp-text="state.groupCount_<?php echo esc_attr($group['slug']); ?>">
                        <?php echo count($group['items']); ?>
                    </span>
                </h3>

                <div class="lfuf-avail-board__items lfuf-avail-board__items--<?php echo esc_attr($layout); ?>">
                    <?php foreach ($group['items'] as $item) : ?>
                        <div
                            class="lfuf-avail-board__item"
                            data-status="<?php echo esc_attr($item['status']); ?>"
                            data-type-slug="<?php echo esc_attr($item['product_slugs'][0] ?? ''); ?>"
                            data-wp-bind--hidden="state.isItemHidden"
                            data-product-id="<?php echo (int) $item['product_id']; ?>"
                        >
                            <?php if ($show_images && $item['thumbnail_url']) : ?>
                                <div class="lfuf-avail-board__item-image">
                                    <img
                                        src="<?php echo esc_url($item['thumbnail_url']); ?>"
                                        alt="<?php echo esc_attr($item['product_name']); ?>"
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
                                        <?php echo esc_html(ucfirst(str_replace('_', ' ', $item['status']))); ?>
                                    </span>
                                </div>

                                <?php if ($show_prices && $item['price']) : ?>
                                    <span class="lfuf-avail-board__item-price">
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
                                    <div class="lfuf-avail-board__item-seasons">
                                        <?php foreach ($item['seasons'] as $season) : ?>
                                            <span class="lfuf-avail-board__season-tag"><?php echo esc_html($season); ?></span>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>

        <!-- ── Board footer ── -->
        <p class="lfuf-avail-board__footer">
            <span data-wp-text="state.footerText">
                <?php printf(
                    esc_html__('Showing %d items', 'leftfield-farm'),
                    $total,
                ); ?>
            </span>
            <?php if ($board['generated_at'] ?? false) : ?>
                <span class="lfuf-avail-board__timestamp">
                    <?php printf(
                        esc_html__('Updated %s', 'leftfield-farm'),
                        esc_html(date_i18n('M j, g:i A', strtotime($board['generated_at']))),
                    ); ?>
                </span>
            <?php endif; ?>
        </p>

    <?php endif; ?>
</div>
