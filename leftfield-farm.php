<?php
/**
 * Plugin Name:       Leftfield Farm
 * Plugin URI:        https://github.com/jwincek/leftfield-farm
 * Description:       Custom data layer, blocks, and tools for Leftfield Urban Farm + Slowbird Bread Co.
 * Version:           1.0.0
 * Requires at least: 6.9
 * Requires PHP:      8.3
 * Author:            Jerome Wincek
 * Author URI:        https://github.com/jwincek
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       leftfield-farm
 * Domain Path:       /languages
 */

declare(strict_types=1);

namespace Leftfield;

defined('ABSPATH') || exit;

const VERSION    = '1.0.0';
const PLUGIN_DIR = __DIR__;
const PREFIX     = 'lfuf';

/* ───────────────────────────────────────────────
 * Module registry
 *
 * Each module has a slug, a label (for future admin UI),
 * and a bootstrap file. The core module is always loaded.
 * Feature modules can be toggled via the
 * 'leftfield_active_modules' filter.
 * ─────────────────────────────────────────────── */

function get_registered_modules(): array {
    return [
        'core' => [
            'label'     => __('Core Data Layer', 'leftfield-farm'),
            'bootstrap' => PLUGIN_DIR . '/modules/core/bootstrap.php',
            'required'  => true,
        ],
        'stand-status' => [
            'label'     => __('Stand Status', 'leftfield-farm'),
            'bootstrap' => PLUGIN_DIR . '/modules/stand-status/bootstrap.php',
            'required'  => false,
        ],
        'availability-board' => [
            'label'     => __('Availability Board', 'leftfield-farm'),
            'bootstrap' => PLUGIN_DIR . '/modules/availability-board/bootstrap.php',
            'required'  => false,
        ],
        // Future modules:
        // 'availability-board' => [ ... ],
        // 'event-manager'      => [ ... ],
        // 'grain-stories'      => [ ... ],
        // 'pre-order-builder'  => [ ... ],
    ];
}

/**
 * Get the list of currently active module slugs.
 *
 * Defaults to all registered modules. Can be filtered to disable
 * specific features without deactivating the plugin.
 *
 * @return string[]
 */
function get_active_modules(): array {
    $registered = get_registered_modules();
    $defaults   = array_keys($registered);

    /** @var string[] $active */
    $active = apply_filters('leftfield_active_modules', $defaults);

    // Ensure required modules are always loaded.
    foreach ($registered as $slug => $config) {
        if ($config['required'] && ! in_array($slug, $active, true)) {
            array_unshift($active, $slug);
        }
    }

    return $active;
}

/**
 * Check whether a module is active.
 */
function is_module_active(string $slug): bool {
    return in_array($slug, get_active_modules(), true);
}

/* ───────────────────────────────────────────────
 * Boot
 * ─────────────────────────────────────────────── */

/**
 * Load active modules.
 */
function boot(): void {
    $registered = get_registered_modules();
    $active     = get_active_modules();

    foreach ($active as $slug) {
        if (isset($registered[$slug]) && file_exists($registered[$slug]['bootstrap'])) {
            require_once $registered[$slug]['bootstrap'];
        }
    }
}

add_action('plugins_loaded', __NAMESPACE__ . '\\boot', 5);

/* ───────────────────────────────────────────────
 * Admin dashboard
 * ─────────────────────────────────────────────── */

if (is_admin()) {
    require_once PLUGIN_DIR . '/includes/admin-dashboard.php';
}

/* ───────────────────────────────────────────────
 * Block registration (all blocks, flat directory)
 * ─────────────────────────────────────────────── */

add_action('init', function (): void {
    $blocks_dir = PLUGIN_DIR . '/blocks';

    foreach (glob($blocks_dir . '/*/block.json') as $block_json) {
        register_block_type(dirname($block_json));
    }
});

/* ───────────────────────────────────────────────
 * Block category
 * ─────────────────────────────────────────────── */

add_filter('block_categories_all', function (array $categories): array {
    array_unshift($categories, [
        'slug'  => 'leftfield',
        'title' => __('Leftfield Farm', 'leftfield-farm'),
        'icon'  => 'carrot',
    ]);
    return $categories;
});

/* ───────────────────────────────────────────────
 * Editor settings (shared across all blocks)
 * ─────────────────────────────────────────────── */

add_action('enqueue_block_editor_assets', function (): void {
    wp_add_inline_script(
        'wp-blocks',
        sprintf(
            'window.lfufSettings = %s;',
            wp_json_encode([
                'restBase'      => esc_url_raw(rest_url('lfuf/v1')),
                'nonce'         => wp_create_nonce('wp_rest'),
                'pluginUrl'     => plugins_url('', __FILE__),
                'activeModules' => get_active_modules(),
            ]),
        ),
        'before',
    );
});

/* ───────────────────────────────────────────────
 * Activation / Deactivation
 * ─────────────────────────────────────────────── */

function activate(): void {
    // Core module handles table creation.
    require_once PLUGIN_DIR . '/modules/core/bootstrap.php';
    \Leftfield\Core\Availability\create_table();
    \Leftfield\Core\Post_Types\register();
    \Leftfield\Core\Taxonomies\register();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, __NAMESPACE__ . '\\activate');

function deactivate(): void {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, __NAMESPACE__ . '\\deactivate');
