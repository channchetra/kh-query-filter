# Query Loop Filters

![image](https://github.com/user-attachments/assets/85358de8-0929-47fe-85f5-b53a59fb522e)

This plugin allows you to easily add taxonomy and post type filters to query loop blocks.

Provides 2 filter blocks:
- **Taxonomy Filter** (`query-filter/taxonomy`) — filter by taxonomy terms
- **Post Type Filter** (`query-filter/post-type`) — filter by post type

Also supports using the core Search block for text search.

## Supported Query Blocks

| Block | Connection method | Taxonomy scoping |
|---|---|---|
| **Core Query Loop** (`core/query`) | Automatic (via block context) or manual connection | Full |
| **GreenShift / GreenLight Query** | Connection by Block ID | Best-effort |
| **Blocksy Advanced Posts** | Connection by Block ID | Best-effort |
| **Other query-style blocks** | Connection by Block ID + Manual mode | Manual |

Any block that exposes recognisable query attributes (`query`, `postType`, `taxQuery`) can be connected. Use the `query_filter_known_query_blocks` PHP filter to register additional block names.

## Usage

### Inside a Core Query Block (original behaviour — unchanged)

1. Add a **Query** block anywhere blocks are supported (page, template, pattern).
2. Insert one of the filter blocks inside the query block and configure as required:
   - **Taxonomy Filter** — select which taxonomy to use, customise the label, customise the "All" option text.
   - **Post Type Filter** — customise the label and the empty option text.
   - **Search block** — no extra options.

The filter automatically uses the parent Query Loop's context (`queryId`, `query`). No extra setup is needed.

### Connecting to an External Query Block

The Taxonomy Filter can now be placed **outside** the core Query block and connected to any query-style block on the same page.

1. Add a **Taxonomy Filter** block anywhere on the page.
2. Open the block's Inspector sidebar → **Block Connection** panel.
3. A dropdown lists all detected query blocks on the page.
4. Select the target block and click **Connect to selected block**.
5. The filter stores a stable identifier for the connection:
   - Prefers the block's **HTML anchor** (set via Advanced → HTML Anchor on the target block). This is the most reliable.
   - Falls back to `queryId` (for core Query blocks) or `blockId`/`uniqueId` attributes.
   - As a last resort uses the block's `clientId` (⚠️ may break on page duplication).
6. The sidebar shows **"Connected to: {block type} {label}"** when connected.
7. Click **Disconnect** to remove the connection.

### Scoped Taxonomy Listing

When connected (or inside) a query block, the taxonomy dropdown is automatically scoped:

- Shows only taxonomies registered for the query's `postType`.
- If the query already has a `taxQuery`, only those taxonomies are shown by default.
- Toggle **"Show all taxonomies for this post type"** to see all applicable taxonomies.

### Manual Mode

If the filter cannot detect or connect to a query block, you can switch to **Manual Mode**:

1. In the Inspector sidebar → **Mode** panel, enable **Manual Mode**.
2. Enter a **Taxonomy Slug** (e.g. `category`, `post_tag`, `genre`).
3. Enter **Term IDs** as a comma-separated list (e.g. `12, 18, 44`).
4. The filter will render a `<select>` with those specific terms.

Manual mode is useful when:
- Working with third-party blocks whose query attributes can't be extracted.
- You want explicit control over which terms appear.
- The block is placed on a page without any query block.

### URL Parameter Scheme

| Scenario | URL parameter format |
|---|---|
| Inside core Query Loop (inherit=false) | `query-{queryId}-{taxonomy}=slug` |
| Inside core Query Loop (inherit=true) | `query-{taxonomy}=slug` |
| Connected to external block | `qf-{stableId}-{taxonomy}=slug` |
| Generic fallback (no connection) | `qf-0-{taxonomy}=slug` |

## Limitations

- **Interactivity API smooth navigation** only works when the filter is inside a core Query block or when the target core Query block's router region covers the filter. Third-party blocks use standard full-page navigation.
- **Third-party block query extraction** is best-effort. If a block uses non-standard attribute names, auto taxonomy scoping may not work. Use manual mode in that case.
- **Connection by `clientId`** is unstable — it may break when duplicating the page or when Gutenberg regenerates client IDs. Always prefer setting an HTML anchor on the target block.
- Post Type Filter still requires the core Query block ancestor (unchanged).

## Installation

### Using Composer

This plugin is available on packagist.

`composer require humanmade/query-filter`

### Manually from Github

1. Download the plugin from the [GitHub repository](https://github.com/humanmade/query-filter).
2. Upload the plugin to your site's `wp-content/plugins` directory.
3. Activate the plugin from the WordPress admin.

## Extending — Registering Additional Query Blocks (PHP)

```php
add_filter( 'query_filter_known_query_blocks', function ( $blocks ) {
    $blocks[] = 'my-plugin/custom-query';
    return $blocks;
} );
```

## Manual Test Plan

### Test 1 — Core Query + Taxonomy Filter (backward compat)

1. Create a page with a core **Query Loop** block.
2. Insert a **Taxonomy Filter** inside the query block.
3. Select a taxonomy (e.g. Category). Verify only taxonomies for the query's post type appear.
4. Save and view the page. Select a term — the query should filter.
5. Verify the URL uses `query-{id}-category=slug` format.
6. Verify other query blocks on the same page are **not** affected.

### Test 2 — External Connection to Core Query

1. Create a page with a core Query Loop block. **Set an HTML anchor** on it (e.g. `main-query`).
2. Place a Taxonomy Filter block **outside** the Query Loop (e.g. above it).
3. Open Inspector → Block Connection → select the Query Loop → Connect.
4. Verify it shows "Connected to: Query Loop (#main-query)".
5. Select a taxonomy, save, and view. Filtering should work.
6. URL should use `qf-main-query-category=slug`.

### Test 3 — Third-party Query Block

1. Install a supported third-party query plugin (GreenShift, Blocksy, etc.).
2. Add their query block to a page and set an HTML anchor.
3. Add a Taxonomy Filter block nearby, connect it via Block Connection.
4. If taxonomy auto-scoping works, verify the dropdown is scoped.
5. If not, switch to Manual Mode with a known taxonomy slug and term IDs.
6. Save and view — filtering by URL params should work.

### Test 4 — Manual Mode

1. Add a Taxonomy Filter block with no query block on the page.
2. Enable Manual Mode.
3. Enter taxonomy slug: `category`. Enter term IDs: `1, 2, 3` (use real IDs from your site).
4. Save and view. The select should show the term names.
5. Selecting a term should navigate and filter the main query.

### Test 5 — Multiple Query Blocks on Same Page

1. Add two core Query Loop blocks with **different** HTML anchors.
2. Connect one Taxonomy Filter to each.
3. Verify filtering one does not affect the other.
4. Verify URL params use different prefixes (`qf-anchor1-...` and `qf-anchor2-...`).
