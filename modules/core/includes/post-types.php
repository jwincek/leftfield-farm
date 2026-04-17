<?php
/**
 * Custom Post Types: lfuf_product, lfuf_source, lfuf_location, lfuf_event
 */

declare(strict_types=1);

namespace Leftfield\Core\Post_Types;

defined('ABSPATH') || exit;

function register(): void {
    register_product();
    register_source();
    register_location();
    register_event();
}

/* ───────────────────────────────────────────────
 * Product — anything grown, baked, or sold.
 * ─────────────────────────────────────────────── */
function register_product(): void {
    $labels = [
        'name'                  => __('Products', 'leftfield-core'),
        'singular_name'         => __('Product', 'leftfield-core'),
        'add_new_item'          => __('Add New Product', 'leftfield-core'),
        'edit_item'             => __('Edit Product', 'leftfield-core'),
        'new_item'              => __('New Product', 'leftfield-core'),
        'view_item'             => __('View Product', 'leftfield-core'),
        'search_items'          => __('Search Products', 'leftfield-core'),
        'not_found'             => __('No products found.', 'leftfield-core'),
        'not_found_in_trash'    => __('No products found in Trash.', 'leftfield-core'),
        'all_items'             => __('All Products', 'leftfield-core'),
        'menu_name'             => __('Products', 'leftfield-core'),
    ];

    register_post_type('lfuf_product', [
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'products', 'with_front' => false],
        'menu_icon'           => 'dashicons-carrot',
        'menu_position'       => 26,
        'supports'            => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'show_in_rest'        => true,
        'rest_base'           => 'products',
        'rest_namespace'      => 'lfuf/v1',
        'template'            => [],
        'template_lock'       => false,
    ]);
}

/* ───────────────────────────────────────────────
 * Source — a grain origin, partner farm, etc.
 * ─────────────────────────────────────────────── */
function register_source(): void {
    $labels = [
        'name'                  => __('Sources', 'leftfield-core'),
        'singular_name'         => __('Source', 'leftfield-core'),
        'add_new_item'          => __('Add New Source', 'leftfield-core'),
        'edit_item'             => __('Edit Source', 'leftfield-core'),
        'new_item'              => __('New Source', 'leftfield-core'),
        'view_item'             => __('View Source', 'leftfield-core'),
        'search_items'          => __('Search Sources', 'leftfield-core'),
        'not_found'             => __('No sources found.', 'leftfield-core'),
        'all_items'             => __('All Sources', 'leftfield-core'),
        'menu_name'             => __('Sources', 'leftfield-core'),
    ];

    register_post_type('lfuf_source', [
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'sources', 'with_front' => false],
        'menu_icon'           => 'dashicons-location-alt',
        'menu_position'       => 27,
        'supports'            => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'show_in_rest'        => true,
        'rest_base'           => 'sources',
        'rest_namespace'      => 'lfuf/v1',
    ]);
}

/* ───────────────────────────────────────────────
 * Location — sales channels (stand, market, farm).
 * ─────────────────────────────────────────────── */
function register_location(): void {
    $labels = [
        'name'                  => __('Locations', 'leftfield-core'),
        'singular_name'         => __('Location', 'leftfield-core'),
        'add_new_item'          => __('Add New Location', 'leftfield-core'),
        'edit_item'             => __('Edit Location', 'leftfield-core'),
        'new_item'              => __('New Location', 'leftfield-core'),
        'view_item'             => __('View Location', 'leftfield-core'),
        'search_items'          => __('Search Locations', 'leftfield-core'),
        'not_found'             => __('No locations found.', 'leftfield-core'),
        'all_items'             => __('All Locations', 'leftfield-core'),
        'menu_name'             => __('Locations', 'leftfield-core'),
    ];

    register_post_type('lfuf_location', [
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'locations', 'with_front' => false],
        'menu_icon'           => 'dashicons-store',
        'menu_position'       => 28,
        'supports'            => ['title', 'editor', 'thumbnail', 'custom-fields'],
        'show_in_rest'        => true,
        'rest_base'           => 'locations',
        'rest_namespace'      => 'lfuf/v1',
    ]);
}

/* ───────────────────────────────────────────────
 * Event — pizza nights, potlucks, farm dinners.
 * ─────────────────────────────────────────────── */
function register_event(): void {
    $labels = [
        'name'                  => __('Events', 'leftfield-core'),
        'singular_name'         => __('Event', 'leftfield-core'),
        'add_new_item'          => __('Add New Event', 'leftfield-core'),
        'edit_item'             => __('Edit Event', 'leftfield-core'),
        'new_item'              => __('New Event', 'leftfield-core'),
        'view_item'             => __('View Event', 'leftfield-core'),
        'search_items'          => __('Search Events', 'leftfield-core'),
        'not_found'             => __('No events found.', 'leftfield-core'),
        'all_items'             => __('All Events', 'leftfield-core'),
        'menu_name'             => __('Events', 'leftfield-core'),
    ];

    register_post_type('lfuf_event', [
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'events', 'with_front' => false],
        'menu_icon'           => 'dashicons-calendar-alt',
        'menu_position'       => 29,
        'supports'            => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'show_in_rest'        => true,
        'rest_base'           => 'events',
        'rest_namespace'      => 'lfuf/v1',
    ]);
}
