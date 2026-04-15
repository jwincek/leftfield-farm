# Leftfield Farm

Custom WordPress plugin for **Leftfield Urban Farm + Slowbird Bread Co.** — a no-till urban farm and cottage bakery in Johnson City, TN.

Single plugin, modular architecture. No build step required.

## Quick Start

1. Clone into `wp-content/plugins/`:
   ```
   git clone https://github.com/jwincek/leftfield-farm.git
   ```
2. Activate in WordPress admin.
3. Go to **🥕 Leftfield** in the sidebar.
4. Click **Load Sample Data** to see the blocks in action with realistic test content.
5. Read [`GETTING-STARTED.md`](GETTING-STARTED.md) for the full walkthrough.

## Requirements

- WordPress 6.5+
- PHP 8.1+

## Architecture

```
leftfield-farm/
├── leftfield-farm.php                 # Bootstrap, module loader, block registration
├── includes/
│   ├── admin-dashboard.php            # Admin dashboard page
│   └── sample-data.php                # Load/remove sample data toggle
├── modules/
│   ├── core/                          # Always loaded
│   │   ├── bootstrap.php
│   │   └── includes/
│   │       ├── post-types.php         # CPTs: product, source, location, event
│   │       ├── taxonomies.php         # product_type, season, event_type
│   │       ├── meta-fields.php        # All post meta (show_in_rest)
│   │       ├── availability-table.php # Custom DB table + CRUD helpers
│   │       ├── rest-api.php           # REST routes under lfuf/v1
│   │       └── abilities.php          # WP 6.9+ Abilities API
│   ├── stand-status/
│   │   ├── bootstrap.php
│   │   └── includes/
│   │       ├── meta-extensions.php    # _lfuf_ss_* meta on locations
│   │       ├── rest-extensions.php    # /stand/{id}/status, /stand/{id}/info
│   │       ├── admin-bar.php          # Admin bar quick-toggle
│   │       └── abilities.php          # Stand-specific abilities
│   ├── availability-board/
│   │   ├── bootstrap.php
│   │   └── includes/
│   │       ├── rest-extensions.php    # /board endpoint with grouped data
│   │       ├── admin-quick-entry.php  # Batch availability update page
│   │       └── abilities.php          # Board abilities
│   └── event-manager/
│       ├── bootstrap.php
│       └── includes/
│           ├── meta-extensions.php    # _lfuf_em_* meta on events
│           ├── rsvp-table.php         # Custom RSVP table + CRUD
│           ├── rest-extensions.php    # Event listing, RSVP endpoints
│           └── abilities.php          # Event abilities
├── blocks/                            # Flat directory, all blocks
│   ├── product-card/                  # Single product display
│   ├── availability-badge/            # Inline status badge
│   ├── location-info/                 # Location card with Venmo
│   ├── stand-status-banner/           # Interactivity API, live polling
│   ├── stand-toggle/                  # Editor-only admin control
│   ├── stand-hours-schedule/          # Weekly schedule grid
│   ├── availability-board/            # Interactivity API, client-side filtering
│   ├── event-list/                    # Interactivity API, inline RSVP
│   └── event-card/                    # Single event embed
├── assets/css/
├── languages/
├── GETTING-STARTED.md                 # Walkthrough for farm operators
├── composer.json
├── .editorconfig
├── .gitignore
└── README.md
```

## Modules

| Module | Status | Purpose |
|--------|--------|---------|
| **Core** | Required | CPTs, taxonomies, meta, availability table, REST API, Abilities API |
| **Stand Status** | Optional | Admin bar toggle, live status banner, schedule display |
| **Availability Board** | Optional | Weekly "what's available" board, admin quick-entry page |
| **Event Manager** | Optional | Event listing, RSVP tracking, inline RSVP forms |

Modules are registered in `leftfield-farm.php`. Disable via filter:

```php
add_filter( 'leftfield_active_modules', function ( array $modules ): array {
    return array_diff( $modules, ['event-manager'] );
} );
```

Check module status: `Leftfield\is_module_active( 'stand-status' )`

## Blocks

| Block | Module | Interactivity API | Purpose |
|-------|--------|-------------------|---------|
| `lfuf/product-card` | Core | No | Single product display |
| `lfuf/availability-badge` | Core | No | Inline status badge |
| `lfuf/location-info` | Core | No | Location card with Venmo |
| `lfuf/stand-status-banner` | Stand Status | Yes | Live open/closed banner |
| `lfuf/stand-toggle` | Stand Status | No | Editor-only toggle control |
| `lfuf/stand-hours-schedule` | Stand Status | No | Weekly schedule grid |
| `lfuf/availability-board` | Availability Board | Yes | Filterable product board |
| `lfuf/event-list` | Event Manager | Yes | Event listing with RSVP |
| `lfuf/event-card` | Event Manager | Yes | Single event embed |

Editor scripts use **no-build IIFE** pattern (plain JS, no webpack).
Front-end view scripts use **Interactivity API** (WP 6.5+) as ES modules via `viewScriptModule`.

## REST API

All under `lfuf/v1`. CPTs get standard WP REST endpoints automatically.

### Core

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/availability` | Public | Current availability (filterable) |
| POST | `/availability` | Editor+ | Upsert a status row |
| DELETE | `/availability/{id}` | Editor+ | Delete a status row |
| GET | `/products/{id}/sources` | Public | Sources linked to a product |
| GET | `/events/{id}/details` | Public | Event + location + products |
| PATCH | `/locations/{id}/toggle` | Editor+ | Toggle open/closed |

### Stand Status

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| PATCH | `/stand/{id}/status` | Editor+ | Toggle + message + timestamp |
| GET | `/stand/{id}/info` | Public | Full stand info (for polling) |
| GET | `/stands` | Public | All stand-type locations |

### Availability Board

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/board` | Public | Grouped board with filters |
| GET | `/board/last-updated` | Public | Latest change timestamp |

### Event Manager

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/events/upcoming` | Public | Upcoming events (filterable) |
| GET | `/events/past` | Public | Past events |
| POST | `/events/{id}/rsvp` | Public | Submit RSVP (name + party size) |
| DELETE | `/rsvp/{token}` | Public | Cancel RSVP by token |
| GET | `/events/{id}/rsvps` | Editor+ | Admin RSVP list |

## Abilities API (WP 6.9+)

Gracefully skipped on older WordPress versions. All abilities are exposed via the `wp-abilities/v1` REST namespace for AI agents, MCP adapters, and automation tools.

| Ability | Category | Access |
|---------|----------|--------|
| `leftfield/list-products` | leftfield-products | Public |
| `leftfield/get-product-sources` | leftfield-products | Public |
| `leftfield/get-availability` | leftfield-availability | Public |
| `leftfield/update-availability` | leftfield-availability | Editor+ |
| `leftfield/list-locations` | leftfield-locations | Public |
| `leftfield/toggle-stand-status` | leftfield-locations | Editor+ |
| `leftfield/get-stand-info` | leftfield-locations | Public |
| `leftfield/get-board` | leftfield-availability | Public |
| `leftfield/list-upcoming-events` | leftfield-events | Public |
| `leftfield/rsvp-to-event` | leftfield-events | Public |

## Data Model

### Custom Post Types

| CPT | REST base | Purpose |
|-----|-----------|---------|
| `lfuf_product` | `products` | Produce, bread, baked goods, seedlings |
| `lfuf_source` | `sources` | Grain origins, partner farms |
| `lfuf_location` | `locations` | Stand, market, on-farm |
| `lfuf_event` | `events` | Pizza nights, potlucks, workshops |

### Custom Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `{prefix}_lfuf_availability` | Core | Time-sensitive product status |
| `{prefix}_lfuf_rsvps` | Event Manager | Event RSVP tracking |

### Key Relationships

- **Product → Sources**: `_lfuf_source_ids` meta (array of IDs)
- **Event → Location**: `_lfuf_event_location_id` meta
- **Event → Products**: `_lfuf_featured_product_ids` meta (array)
- **Availability → Product + Location**: FK in custom table

## Action Hooks

| Hook | Module | Fires when |
|------|--------|------------|
| `lfuf_stand_status_changed` | Stand Status | Stand is toggled open/closed |
| `lfuf_rsvp_added` | Event Manager | New RSVP is submitted |
| `lfuf_rsvp_cancelled` | Event Manager | RSVP is cancelled |

## Sample Data

The plugin includes a sample data seeder for testing:

1. Go to **🥕 Leftfield** dashboard.
2. Click **Load Sample Data** — creates 8 products, 2 locations, 3 events, and availability entries.
3. Explore blocks on your pages.
4. Click **Remove Sample Data** to clean up (deletes all sample content and orphaned table rows).

All sample posts are tagged with `_lfuf_sample_data` meta so they're cleanly identifiable.

## WordPress APIs

| API | Version | Usage |
|-----|---------|-------|
| Block API (apiVersion 3) | 6.1+ | All 9 blocks |
| Interactivity API | 6.5+ | 4 blocks with reactive front ends |
| Abilities API | 6.9+ | 10 discoverable abilities |
| REST API | 4.7+ | 16 endpoints under `lfuf/v1` |
| Script Modules | 6.5+ | Interactivity API view scripts |

### Forward-looking (WP 7.0)

The plugin is structured for easy adoption of upcoming WP 7.0 features:

- **`watch()` function**: Stand status polling and board refresh can move from `setInterval` to reactive watchers. Comments in view.js files mark the exact swap points.
- **Client-side Abilities API**: Ability names and JSON Schema shapes match the `@wordpress/abilities` registration pattern. Adding `registerAbility()` calls in JS will be additive.
- **`state.url` from `core/router`**: Analytics page views on client-side navigation can be added without refactoring.

## Development

No build step. Edit files directly.

- **Editor scripts**: No-build IIFE, using `wp.blocks`, `wp.element`, etc.
- **View scripts**: ES modules importing from `@wordpress/interactivity`.
- **Styles**: Plain CSS, one file per block.
- **PHP**: Namespaced, PHP 8.1+ strict types throughout.

## Documentation

- [`README.md`](README.md) — Developer reference (this file)
- [`GETTING-STARTED.md`](GETTING-STARTED.md) — Step-by-step walkthrough for farm operators

## License

GPL-2.0-or-later
