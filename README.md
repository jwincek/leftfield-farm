# Leftfield Farm

Custom WordPress plugin for **Leftfield Urban Farm + Slowbird Bread Co.** — a no-till urban farm and cottage bakery in Johnson City, TN.

Single plugin, modular architecture. No build step required.

## Requirements

- WordPress 6.5+
- PHP 8.1+

## Architecture

```
leftfield-farm/
├── leftfield-farm.php                 # Bootstrap, module loader, block registration
├── modules/
│   ├── core/                          # Always loaded
│   │   ├── bootstrap.php
│   │   └── includes/
│   │       ├── post-types.php         # CPTs: product, source, location, event
│   │       ├── taxonomies.php         # product_type, season, event_type
│   │       ├── meta-fields.php        # All post meta (show_in_rest)
│   │       ├── availability-table.php # Custom DB table + CRUD helpers
│   │       ├── rest-api.php           # REST routes under lfuf/v1
│   │       └── abilities.php          # WP 6.9+ Abilities API registration
│   └── stand-status/                  # Togglable feature module
│       ├── bootstrap.php
│       └── includes/
│           ├── meta-extensions.php    # _lfuf_ss_* meta on locations
│           ├── rest-extensions.php    # /stand/{id}/status, /stand/{id}/info
│           ├── admin-bar.php          # WP admin bar quick-toggle
│           └── abilities.php          # Stand-specific abilities
├── blocks/                            # Flat directory, all blocks
│   ├── product-card/
│   ├── availability-badge/
│   ├── location-info/
│   ├── stand-status-banner/           # Uses Interactivity API
│   ├── stand-toggle/                  # Editor-only
│   └── stand-hours-schedule/
├── assets/css/
├── languages/
├── composer.json
├── .gitignore
├── .editorconfig
└── README.md
```

## Modules

### Core (always active)

The shared data layer. Registers four custom post types (`lfuf_product`, `lfuf_source`, `lfuf_location`, `lfuf_event`), three taxonomies (`lfuf_product_type`, `lfuf_season`, `lfuf_event_type`), a custom `{prefix}_lfuf_availability` table for time-sensitive product status, REST API endpoints under `lfuf/v1`, and Abilities API abilities for AI/automation discoverability.

### Stand Status

Real-time open/closed status for the roadside stand. Admin bar toggle, REST endpoints for status changes, and three blocks:
- **Stand Status Banner** — front-end display with Interactivity API reactive updates and optional polling
- **Stand Quick Toggle** — editor-only control panel for toggling status
- **Stand Hours Schedule** — weekly schedule grid with today highlighted

### Future Modules (planned)

- **Availability Board** — weekly "what's available" display reading from the shared availability table
- **Event Manager** — pizza nights, potlucks, farm dinners, workshops
- **Grain Stories** — sourcing narratives for Slowbird Bread's local grains
- **Pre-Order Builder** — lightweight box builder for pickup orders

## Module System

Modules are registered in `leftfield-farm.php` and loaded via the `leftfield_active_modules` filter. Core is always loaded. Feature modules can be disabled:

```php
add_filter( 'leftfield_active_modules', function ( array $modules ): array {
    return array_diff( $modules, ['stand-status'] );
} );
```

Check module status from any code:

```php
if ( Leftfield\is_module_active( 'stand-status' ) ) {
    // Module-specific logic.
}
```

## Block Development

All blocks use the **no-build IIFE** pattern for editor scripts — plain JS using `wp.blocks`, `wp.element`, `wp.blockEditor`, and `wp.components`. No webpack, no `@wordpress/scripts`.

Front-end view scripts use the **Interactivity API** (WP 6.5+) where reactivity is needed, loaded as ES modules via `viewScriptModule` in `block.json`.

Blocks live in a flat `blocks/` directory. Each block has:
- `block.json` — metadata and attribute schema
- `index.js` — editor IIFE
- `render.php` — server-side render
- `style.css` — shared front + editor styles
- `view.js` — front-end Interactivity API module (where applicable)
- `editor.css` — editor-only styles (where applicable)

## WordPress APIs Used

| API | Version | Usage |
|-----|---------|-------|
| Block API (apiVersion 3) | 6.1+ | All blocks |
| Interactivity API | 6.5+ | Stand status banner reactive updates |
| Abilities API | 6.9+ | Discoverable abilities for AI/MCP/automation |
| REST API | 4.7+ | All data endpoints under `lfuf/v1` |
| Script Modules | 6.5+ | Front-end Interactivity API view scripts |

## REST API Endpoints

All under `lfuf/v1`. CPTs get standard WP REST endpoints automatically via `show_in_rest`.

### Core

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/availability` | Public | All current availability |
| POST | `/availability` | Editor+ | Upsert a status row |
| DELETE | `/availability/{id}` | Editor+ | Delete a status row |
| GET | `/products/{id}/sources` | Public | Sources linked to a product |
| GET | `/events/{id}/details` | Public | Event + location + products |
| PATCH | `/locations/{id}/toggle` | Editor+ | Toggle open/closed |

### Stand Status

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| PATCH | `/stand/{id}/status` | Editor+ | Toggle + set message + timestamp |
| GET | `/stand/{id}/info` | Public | Full stand info (for polling) |
| GET | `/stands` | Public | List all stand-type locations |

## Abilities (WP 6.9+)

Gracefully skipped on older versions. Registered under the `wp-abilities/v1` namespace.

### Core abilities

| Ability | Category | Access |
|---------|----------|--------|
| `leftfield/list-products` | leftfield-products | Public |
| `leftfield/get-product-sources` | leftfield-products | Public |
| `leftfield/get-availability` | leftfield-availability | Public |
| `leftfield/update-availability` | leftfield-availability | Editor+ |
| `leftfield/list-locations` | leftfield-locations | Public |

### Stand Status abilities

| Ability | Category | Access |
|---------|----------|--------|
| `leftfield/toggle-stand-status` | leftfield-locations | Editor+ |
| `leftfield/get-stand-info` | leftfield-locations | Public |

## Data Model

### Custom Post Types

| CPT | REST base | Purpose |
|-----|-----------|---------|
| `lfuf_product` | `products` | Anything grown, baked, or sold |
| `lfuf_source` | `sources` | Grain origins, partner farms |
| `lfuf_location` | `locations` | Sales channels |
| `lfuf_event` | `events` | Farm events |

### Availability Table

`{prefix}_lfuf_availability` — time-sensitive product status.

| Column | Type | Notes |
|--------|------|-------|
| `product_id` | BIGINT | → `lfuf_product` |
| `location_id` | BIGINT | → `lfuf_location` (0 = all) |
| `status` | VARCHAR(20) | abundant, available, limited, sold_out, unavailable |
| `effective_date` | DATE | When status takes effect |
| `expires_date` | DATE | Auto-expire (nullable) |

### Key Relationships

- **Product → Sources**: `_lfuf_source_ids` meta (array)
- **Event → Location**: `_lfuf_event_location_id` meta
- **Event → Products**: `_lfuf_featured_product_ids` meta (array)
- **Availability → Product + Location**: FK in custom table

## Setup

1. Clone into `wp-content/plugins/`:
   ```
   git clone https://github.com/jwincek/leftfield-farm.git
   ```
2. Activate in WordPress admin.
3. Create a Location post with type "stand", set address and Venmo handle.
4. Add the Stand Status Banner block to the homepage.
5. Use the admin bar dot to toggle the stand open/closed.

## License

GPL-2.0-or-later
