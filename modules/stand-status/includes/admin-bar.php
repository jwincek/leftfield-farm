<?php
/**
 * Admin Bar quick-toggle for stand status.
 *
 * Adds an "Open Stand" / "Close Stand" button to the WP admin bar
 * so editors can toggle without navigating to the post editor.
 * Works on both desktop and the WP mobile app admin bar.
 */

declare(strict_types=1);

namespace Leftfield\StandStatus\AdminBar;

defined('ABSPATH') || exit;

add_action('admin_bar_menu', __NAMESPACE__ . '\\add_toggle_node', 100);
add_action('wp_head', __NAMESPACE__ . '\\inline_styles');
add_action('admin_head', __NAMESPACE__ . '\\inline_styles');
add_action('wp_footer', __NAMESPACE__ . '\\inline_script');
add_action('admin_footer', __NAMESPACE__ . '\\inline_script');

/**
 * Get the primary stand location (first stand-type location found).
 * Cached per request.
 */
function get_primary_stand(): ?\WP_Post {
    static $stand = null;
    static $resolved = false;

    if ($resolved) {
        return $stand;
    }

    $resolved = true;

    $locations = get_posts([
        'post_type'   => 'lfuf_location',
        'post_status' => 'publish',
        'numberposts' => 1,
        'meta_query'  => [
            [
                'key'   => '_lfuf_location_type',
                'value' => 'stand',
            ],
        ],
    ]);

    $stand = $locations[0] ?? null;
    return $stand;
}

function add_toggle_node(\WP_Admin_Bar $wp_admin_bar): void {
    if (! current_user_can('edit_posts')) {
        return;
    }

    $stand = get_primary_stand();
    if (! $stand) {
        return;
    }

    $is_open = (bool) get_post_meta($stand->ID, '_lfuf_is_open', true);
    $message = get_post_meta($stand->ID, '_lfuf_ss_status_message', true);

    $wp_admin_bar->add_node([
        'id'    => 'lfuf-stand-toggle',
        'title' => sprintf(
            '<span class="lfuf-ab-indicator lfuf-ab-indicator--%s"></span> %s %s',
            $is_open ? 'open' : 'closed',
            $is_open ? __('Stand Open', 'leftfield-stand-status') : __('Stand Closed', 'leftfield-stand-status'),
            $message ? '— ' . esc_html($message) : '',
        ),
        'href'  => '#',
        'meta'  => [
            'class' => 'lfuf-stand-toggle-node',
        ],
    ]);

    // Sub-menu: Toggle action.
    $wp_admin_bar->add_node([
        'id'     => 'lfuf-stand-toggle-action',
        'parent' => 'lfuf-stand-toggle',
        'title'  => $is_open
            ? __('Close the Stand', 'leftfield-stand-status')
            : __('Open the Stand', 'leftfield-stand-status'),
        'href'   => '#',
        'meta'   => [
            'class'    => 'lfuf-stand-toggle-action',
            'data-id'  => (string) $stand->ID,
            'data-new' => $is_open ? '0' : '1',
        ],
    ]);

    // Sub-menu: Set a message.
    $wp_admin_bar->add_node([
        'id'     => 'lfuf-stand-set-message',
        'parent' => 'lfuf-stand-toggle',
        'title'  => __('Set Status Message…', 'leftfield-stand-status'),
        'href'   => '#',
        'meta'   => [
            'class'   => 'lfuf-stand-set-message',
            'data-id' => (string) $stand->ID,
        ],
    ]);

    // Sub-menu: Edit location post.
    $wp_admin_bar->add_node([
        'id'     => 'lfuf-stand-edit',
        'parent' => 'lfuf-stand-toggle',
        'title'  => __('Edit Stand Settings', 'leftfield-stand-status'),
        'href'   => get_edit_post_link($stand->ID, 'raw'),
    ]);
}

function inline_styles(): void {
    if (! current_user_can('edit_posts') || ! get_primary_stand()) {
        return;
    }
    ?>
    <style>
        .lfuf-ab-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
            vertical-align: middle;
        }
        .lfuf-ab-indicator--open  { background: #22c55e; box-shadow: 0 0 4px #22c55e; }
        .lfuf-ab-indicator--closed { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
        #wp-admin-bar-lfuf-stand-toggle > .ab-item { cursor: pointer; }
    </style>
    <?php
}

function inline_script(): void {
    if (! current_user_can('edit_posts') || ! get_primary_stand()) {
        return;
    }

    $stand = get_primary_stand();
    ?>
    <script>
    ( function () {
        'use strict';

        var restBase = <?php echo wp_json_encode(esc_url_raw(rest_url('lfuf/v1'))); ?>;
        var nonce    = <?php echo wp_json_encode(wp_create_nonce('wp_rest')); ?>;

        function toggleStand( locationId, newState, message ) {
            return fetch( restBase + '/stand/' + locationId + '/status', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': nonce,
                },
                body: JSON.stringify( {
                    is_open: !! newState,
                    status_message: message || '',
                } ),
            } ).then( function ( r ) { return r.json(); } );
        }

        document.addEventListener( 'click', function ( e ) {
            // Toggle action.
            var toggleLink = e.target.closest( '#wp-admin-bar-lfuf-stand-toggle-action a, #wp-admin-bar-lfuf-stand-toggle-action' );
            if ( toggleLink ) {
                e.preventDefault();
                var node  = document.querySelector( '#wp-admin-bar-lfuf-stand-toggle-action' );
                var id    = <?php echo (int) $stand->ID; ?>;
                var newSt = node.getAttribute( 'data-new' ) === '1';

                toggleStand( id, newSt, '' ).then( function () {
                    window.location.reload();
                } );
            }

            // Set message.
            var msgLink = e.target.closest( '#wp-admin-bar-lfuf-stand-set-message a, #wp-admin-bar-lfuf-stand-set-message' );
            if ( msgLink ) {
                e.preventDefault();
                var msg = window.prompt( 'Stand status message (leave blank to clear):' );
                if ( msg === null ) return; // cancelled

                var id2     = <?php echo (int) $stand->ID; ?>;
                var current = <?php echo wp_json_encode((bool) get_post_meta($stand->ID, '_lfuf_is_open', true)); ?>;

                toggleStand( id2, current, msg ).then( function () {
                    window.location.reload();
                } );
            }
        } );
    } )();
    </script>
    <?php
}
