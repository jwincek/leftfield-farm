<?php
/**
 * Custom table: {prefix}_lfuf_rsvps
 *
 * Lightweight RSVP/headcount tracking. Each row is one person
 * saying "I'm planning to come" to an event. No user account
 * required — just a name and optional email/phone.
 *
 * Designed for donation-based pizza nights and potlucks where
 * an exact count helps the farm plan portions, not for ticketing.
 */

declare(strict_types=1);

namespace Leftfield\EventManager\RSVP;

defined('ABSPATH') || exit;

add_action('plugins_loaded', function (): void {
    if (get_option('lfuf_rsvp_db_version') !== '1.0.0') {
        create_table();
    }
}, 20);

function table_name(): string {
    global $wpdb;
    return $wpdb->prefix . 'lfuf_rsvps';
}

function create_table(): void {
    global $wpdb;

    $table   = table_name();
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE {$table} (
        id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        event_id    BIGINT UNSIGNED NOT NULL,
        name        VARCHAR(200)    NOT NULL,
        email       VARCHAR(200)    NOT NULL DEFAULT '',
        party_size  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
        note        VARCHAR(500)    NOT NULL DEFAULT '',
        token       VARCHAR(64)     NOT NULL,
        created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_event (event_id),
        UNIQUE KEY idx_token (token)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);

    update_option('lfuf_rsvp_db_version', '1.0.0');
}

/**
 * Add an RSVP to an event.
 *
 * Returns the RSVP row on success (including a token for
 * cancellation), or WP_Error on failure.
 *
 * @param array{
 *     event_id:    int,
 *     name:        string,
 *     email?:      string,
 *     party_size?: int,
 *     note?:       string,
 * } $data
 * @return array|\WP_Error
 */
function add_rsvp(array $data): array|\WP_Error {
    global $wpdb;

    $event_id = (int) ($data['event_id'] ?? 0);
    $event    = get_post($event_id);

    if (! $event || $event->post_type !== 'lfuf_event' || $event->post_status !== 'publish') {
        return new \WP_Error('invalid_event', __('Event not found.', 'leftfield-farm'));
    }

    // Check if cancelled.
    if ((bool) get_post_meta($event_id, '_lfuf_em_cancelled', true)) {
        return new \WP_Error('event_cancelled', __('This event has been cancelled.', 'leftfield-farm'));
    }

    // Check if RSVPs are enabled.
    if (! (bool) get_post_meta($event_id, '_lfuf_em_rsvp_enabled', true)) {
        return new \WP_Error('rsvp_disabled', __('RSVPs are not enabled for this event.', 'leftfield-farm'));
    }

    // Check if manually closed.
    if ((bool) get_post_meta($event_id, '_lfuf_em_rsvp_closed', true)) {
        return new \WP_Error('rsvp_closed', __('RSVPs are closed for this event.', 'leftfield-farm'));
    }

    // Check cap.
    $cap = (int) get_post_meta($event_id, '_lfuf_rsvp_cap', true);
    if ($cap > 0) {
        $current_count = get_headcount($event_id);
        $party_size    = max(1, (int) ($data['party_size'] ?? 1));
        if ($current_count + $party_size > $cap) {
            return new \WP_Error(
                'rsvp_full',
                __('Sorry, this event is at capacity.', 'leftfield-farm'),
            );
        }
    }

    $name = sanitize_text_field($data['name'] ?? '');
    if (empty($name)) {
        return new \WP_Error('name_required', __('Please provide your name.', 'leftfield-farm'));
    }

    $token = wp_generate_password(32, false);

    $row = [
        'event_id'   => $event_id,
        'name'       => $name,
        'email'      => sanitize_email($data['email'] ?? ''),
        'party_size' => max(1, (int) ($data['party_size'] ?? 1)),
        'note'       => sanitize_text_field($data['note'] ?? ''),
        'token'      => $token,
    ];

    $wpdb->insert(table_name(), $row, ['%d', '%s', '%s', '%d', '%s', '%s']);

    if (! $wpdb->insert_id) {
        return new \WP_Error('db_error', __('Could not save RSVP.', 'leftfield-farm'));
    }

    $row['id'] = (int) $wpdb->insert_id;

    /**
     * Fires after a new RSVP is added.
     *
     * @param array $row   The RSVP data including id and token.
     * @param int   $event_id
     */
    do_action('lfuf_rsvp_added', $row, $event_id);

    return $row;
}

/**
 * Cancel an RSVP by its token.
 */
function cancel_rsvp(string $token): bool {
    global $wpdb;

    $table = table_name();
    $rsvp  = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE token = %s LIMIT 1",
        $token,
    ));

    if (! $rsvp) {
        return false;
    }

    $deleted = (bool) $wpdb->delete($table, ['token' => $token], ['%s']);

    if ($deleted) {
        do_action('lfuf_rsvp_cancelled', (array) $rsvp, (int) $rsvp->event_id);
    }

    return $deleted;
}

/**
 * Get the total headcount (sum of party_size) for an event.
 */
function get_headcount(int $event_id): int {
    global $wpdb;

    $table = table_name();

    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COALESCE(SUM(party_size), 0) FROM {$table} WHERE event_id = %d",
        $event_id,
    ));
}

/**
 * Get the RSVP count (number of rows) for an event.
 */
function get_rsvp_count(int $event_id): int {
    global $wpdb;

    $table = table_name();

    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE event_id = %d",
        $event_id,
    ));
}

/**
 * Get all RSVPs for an event (admin view).
 *
 * @return object[]
 */
function get_event_rsvps(int $event_id): array {
    global $wpdb;

    $table = table_name();

    return $wpdb->get_results($wpdb->prepare(
        "SELECT id, name, email, party_size, note, created_at
         FROM {$table}
         WHERE event_id = %d
         ORDER BY created_at ASC",
        $event_id,
    ));
}

/**
 * Get RSVP summary for an event (public-safe).
 */
function get_event_rsvp_summary(int $event_id): array {
    $cap        = (int) get_post_meta($event_id, '_lfuf_rsvp_cap', true);
    $headcount  = get_headcount($event_id);
    $rsvp_count = get_rsvp_count($event_id);
    $enabled    = (bool) get_post_meta($event_id, '_lfuf_em_rsvp_enabled', true);
    $closed     = (bool) get_post_meta($event_id, '_lfuf_em_rsvp_closed', true);

    return [
        'enabled'    => $enabled,
        'closed'     => $closed,
        'headcount'  => $headcount,
        'rsvp_count' => $rsvp_count,
        'cap'        => $cap,
        'spots_left' => $cap > 0 ? max(0, $cap - $headcount) : null,
        'is_full'    => $cap > 0 && $headcount >= $cap,
    ];
}
