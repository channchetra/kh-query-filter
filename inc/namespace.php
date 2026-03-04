<?php
/**
 * Query filter main file.
 *
 * @package query-filter
 */

namespace HM\Query_Loop_Filter;

use WP_HTML_Tag_Processor;
use WP_Query;

/**
 * Global stack tracking which query-type blocks are currently rendering.
 * Used to match qf-* GET params to the correct WP_Query instance.
 *
 * @var string[]
 */
global $qf_rendering_query_blocks;
$qf_rendering_query_blocks = [];

/**
 * Connect namespace methods to hooks and filters.
 *
 * @return void
 */
function bootstrap() : void {
	// General hooks.
	add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\\filter_query_loop_block_query_vars', 10, 3 );
	add_filter( 'pre_get_posts', __NAMESPACE__ . '\\pre_get_posts_transpose_query_vars' );
	add_filter( 'block_type_metadata', __NAMESPACE__ . '\\filter_block_type_metadata', 10 );
	add_action( 'init', __NAMESPACE__ . '\\register_blocks' );
	add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\action_wp_enqueue_scripts' );

	// Search.
	add_filter( 'render_block_core/search', __NAMESPACE__ . '\\render_block_search', 10, 3 );

	// Query.
	add_filter( 'render_block_core/query', __NAMESPACE__ . '\\render_block_query', 10, 3 );

	// Track query-type block rendering for connected-block filtering.
	add_filter( 'pre_render_block', __NAMESPACE__ . '\\track_query_block_pre_render', 10, 2 );
	add_filter( 'render_block', __NAMESPACE__ . '\\track_query_block_post_render', 10, 2 );

	// Third-party block query hooks.
	// GreenShift: filter query args before WP_Query is created.
	add_filter( 'gspb_module_args_query_id', __NAMESPACE__ . '\\filter_greenshift_query_args', 10, 2 );
	// Blocksy: filter query args before WP_Query is created.
	add_filter( 'blocksy:general:blocks:query:args', __NAMESPACE__ . '\\filter_blocksy_query_args', 10, 2 );
}

/**
 * Get the list of known query-type block names.
 *
 * Includes core/query and supported third-party query blocks.
 * Filterable so other plugins can register their blocks.
 *
 * @return string[]
 */
function get_known_query_block_names() : array {
	return apply_filters( 'query_filter_known_query_blocks', [
		'core/query',
		'greenshift-blocks/querygrid',
		'blocksy/query',
	] );
}

/**
 * Track when a known query-type block starts rendering.
 *
 * Pushes the block's stable identifier onto a global stack so that
 * pre_get_posts can match qf-* URL params to the correct WP_Query.
 *
 * @param string|null $pre_render  The pre-rendered content (null = not pre-rendered).
 * @param array       $parsed_block The block being rendered.
 * @return string|null Unchanged pre_render value.
 */
function track_query_block_pre_render( $pre_render, array $parsed_block ) {
	global $qf_rendering_query_blocks;

	$block_name = $parsed_block['blockName'] ?? '';
	if ( ! in_array( $block_name, get_known_query_block_names(), true ) ) {
		return $pre_render;
	}

	$attrs    = $parsed_block['attrs'] ?? [];
	$anchor   = $attrs['anchor'] ?? '';
	$query_id = $attrs['queryId'] ?? null;
	// GreenShift uses `id`, Blocksy uses `uniqueId`, generic uses `blockId`.
	$block_id = $attrs['id'] ?? ( $attrs['uniqueId'] ?? ( $attrs['blockId'] ?? '' ) );

	// Build stable ID: prefer anchor, then queryId-based, then blockId/id.
	if ( $anchor ) {
		$stable_id = $anchor;
	} elseif ( $query_id !== null ) {
		$stable_id = 'query-' . $query_id;
	} elseif ( $block_id ) {
		$stable_id = (string) $block_id;
	} else {
		$stable_id = '';
	}

	if ( $stable_id ) {
		$qf_rendering_query_blocks[] = sanitize_key( $stable_id );
	}

	return $pre_render;
}

/**
 * Pop the rendering stack when a known query-type block finishes rendering.
 *
 * @param string $content      The block content.
 * @param array  $parsed_block The block that just finished rendering.
 * @return string Unchanged content.
 */
function track_query_block_post_render( string $content, array $parsed_block ) : string {
	global $qf_rendering_query_blocks;

	$block_name = $parsed_block['blockName'] ?? '';
	if (
		! in_array( $block_name, get_known_query_block_names(), true ) ||
		empty( $qf_rendering_query_blocks )
	) {
		return $content;
	}

	$stable_id = array_pop( $qf_rendering_query_blocks );

	// For non-core blocks, inject data-qf-block-id so the frontend
	// partial-refresh logic can locate the query container.
	if ( $block_name !== 'core/query' && $stable_id ) {
		$processor = new WP_HTML_Tag_Processor( $content );
		// Use next_tag() (any tag) instead of next_tag('div') so we match
		// any wrapper element type (div, section, ul, etc.).
		if ( $processor->next_tag() ) {
			$processor->set_attribute( 'data-qf-block-id', $stable_id );
			$content = (string) $processor;
		}
	}

	return $content;
}

/**
 * Fires when scripts and styles are enqueued.
 *
 * @TODO work out why this doesn't work but building interactivity via the blocks does.
 */
function action_wp_enqueue_scripts() : void {
	$asset = include ROOT_DIR . '/build/taxonomy/index.asset.php';
	wp_register_style(
		'query-filter-view',
		plugins_url( '/build/taxonomy/index.css', PLUGIN_FILE ),
		[],
		$asset['version']
	);
}

/**
 * Fires after WordPress has finished loading but before any headers are sent.
 *
 */
function register_blocks() : void {
	register_block_type( ROOT_DIR . '/build/taxonomy' );
	register_block_type( ROOT_DIR . '/build/post-type' );
	register_block_type( ROOT_DIR . '/build/search' );
	register_block_type( ROOT_DIR . '/build/filter-group' );
}

/**
 * Filters the arguments which will be passed to `WP_Query` for the Query Loop Block.
 *
 * @param array     $query Array containing parameters for <code>WP_Query</code> as parsed by the block context.
 * @param \WP_Block $block Block instance.
 * @param int       $page  Current query's page.
 * @return array Array containing parameters for <code>WP_Query</code> as parsed by the block context.
 */
function filter_query_loop_block_query_vars( array $query, \WP_Block $block, int $page ) : array {
	if ( isset( $block->context['queryId'] ) ) {
		$query['query_id'] = $block->context['queryId'];
	}

	return $query;
}

/**
 * Fires after the query variable object is created, but before the actual query is run.
 *
 * Handles two URL parameter schemes:
 * 1. query-{queryId}-{taxonomy} — backward-compat for core Query Loop blocks.
 * 2. qf-{stableId}-{taxonomy}  — connected-block filtering (core & third-party).
 * 3. qf-0-{taxonomy}           — generic fallback targeting the main query.
 *
 * @param  WP_Query $query The WP_Query instance (passed by reference).
 */
function pre_get_posts_transpose_query_vars( WP_Query $query ) : void {
	$query_id = $query->get( 'query_id', null );

	// === Phase 1: Standard query-* param handling (backward compat) ===
	if ( $query->is_main_query() || ! is_null( $query_id ) ) {
		$prefix = $query->is_main_query() ? 'query-' : "query-{$query_id}-";
		$tax_query = [];
		$valid_keys = [
			'post_type' => $query->is_search() ? 'any' : 'post',
			's' => '',
		];

		// Preserve valid params for later retrieval.
		foreach ( $valid_keys as $key => $default ) {
			$query->set(
				"query-filter-$key",
				$query->get( $key, $default )
			);
		}

		// Map get params to this query.
		foreach ( $_GET as $key => $value ) {
			if ( strpos( $key, $prefix ) === 0 ) {
				$key = str_replace( $prefix, '', $key );
				$value = sanitize_text_field( urldecode( wp_unslash( $value ) ) );

				// Handle taxonomies specifically.
				if ( get_taxonomy( $key ) ) {
					$tax_query['relation'] = 'AND';
					$tax_query[] = [
						'taxonomy' => $key,
						'terms' => [ $value ],
						'field' => 'slug',
					];
				} else {
					// Other options should map directly to query vars.
					$key = sanitize_key( $key );

					if ( ! in_array( $key, array_keys( $valid_keys ), true ) ) {
						continue;
					}

					$query->set(
						$key,
						$value
					);
				}
			}
		}

		if ( ! empty( $tax_query ) ) {
			$existing_query = $query->get( 'tax_query', [] );

			if ( ! empty( $existing_query ) ) {
				$tax_query = [
					'relation' => 'AND',
					[ $existing_query ],
					$tax_query,
				];
			}

			$query->set( 'tax_query', $tax_query );
		}
	}

	// === Phase 2: Connected block qf-* param handling ===
	apply_qf_connected_params( $query );
}

/**
 * Apply qf-{stableId}-{taxonomy} GET params to a WP_Query.
 *
 * Matches params against:
 *  - The currently-rendering query block (global stack), for secondary queries.
 *  - qf-0-{taxonomy} params for the main query (generic fallback).
 *
 * @param WP_Query $query The query to modify.
 */
function apply_qf_connected_params( WP_Query $query ) : void {
	global $qf_rendering_query_blocks;

	// Skip if this query was already filtered by a third-party block hook
	// (GreenShift / Blocksy). Prevents duplicate tax_query entries.
	if ( $query->get( '_qf_filtered' ) ) {
		return;
	}

	$prefixes = [];

	// For main query, also handle the generic qf-0-* prefix.
	if ( $query->is_main_query() ) {
		$prefixes[] = 'qf-0-';
	}

	// For any query while a tracked block is rendering.
	if ( ! empty( $qf_rendering_query_blocks ) ) {
		$current_stable_id = end( $qf_rendering_query_blocks );
		$prefixes[] = 'qf-' . $current_stable_id . '-';
	}

	if ( empty( $prefixes ) ) {
		return;
	}

	$qf_tax_query = [];

	foreach ( $_GET as $key => $value ) {
		foreach ( $prefixes as $prefix ) {
			if ( strpos( $key, $prefix ) === 0 ) {
				$param_key = sanitize_key( str_replace( $prefix, '', $key ) );
				$value     = sanitize_text_field( urldecode( wp_unslash( $value ) ) );

				if ( $param_key === 's' && ! empty( $value ) ) {
					// Search parameter.
					$query->set( 's', $value );
				} elseif ( $param_key && get_taxonomy( $param_key ) && ! empty( $value ) ) {
					$qf_tax_query[] = [
						'taxonomy' => $param_key,
						'terms'    => [ $value ],
						'field'    => 'slug',
					];
				}
				break; // Matched a prefix, no need to check others.
			}
		}
	}

	if ( ! empty( $qf_tax_query ) ) {
		$qf_tax_query['relation'] = 'AND';
		$existing = $query->get( 'tax_query', [] );

		if ( ! empty( $existing ) ) {
			$qf_tax_query = [
				'relation' => 'AND',
				$existing,
				$qf_tax_query,
			];
		}

		$query->set( 'tax_query', $qf_tax_query );
	}
}

/**
 * Filters the settings determined from the block type metadata.
 *
 * @param array $metadata Metadata provided for registering a block type.
 * @return array Array of metadata for registering a block type.
 */
function filter_block_type_metadata( array $metadata ) : array {
	// Add query context to search block.
	if ( $metadata['name'] === 'core/search' ) {
		$metadata['usesContext'] = array_merge( $metadata['usesContext'] ?? [], [ 'queryId', 'query' ] );
	}

	return $metadata;
}

/**
 * Filters the content of a single block.
 *
 * @param string    $block_content The block content.
 * @param array     $block         The full block, including name and attributes.
 * @param \WP_Block $instance      The block instance.
 * @return string The block content.
 */
function render_block_search( string $block_content, array $block, \WP_Block $instance ) : string {
	if ( empty( $instance->context['query'] ) ) {
		return $block_content;
	}

	wp_enqueue_script_module( 'query-filter-taxonomy-view-script-module' );

	$query_var = empty( $instance->context['query']['inherit'] )
		? sprintf( 'query-%d-s', $instance->context['queryId'] ?? 0 )
		: 'query-s';

	$action = str_replace( '/page/'. get_query_var( 'paged', 1 ), '', add_query_arg( [ $query_var => '' ] ) );

	// Note sanitize_text_field trims whitespace from start/end of string causing unexpected behaviour.
	$value = wp_unslash( $_GET[ $query_var ] ?? '' );
	$value = urldecode( $value );
	$value = wp_check_invalid_utf8( $value );
	$value = wp_pre_kses_less_than( $value );
	$value = strip_tags( $value );

	wp_interactivity_state( 'query-filter', [
		'searchValue' => $value,
	] );

	$block_content = new WP_HTML_Tag_Processor( $block_content );
	$block_content->next_tag( [ 'tag_name' => 'form' ] );
	$block_content->set_attribute( 'action', $action );
	$block_content->set_attribute( 'data-wp-interactive', 'query-filter' );
	$block_content->set_attribute( 'data-wp-on--submit', 'actions.search' );
	$block_content->set_attribute( 'data-wp-context', '{searchValue:""}' );
	$block_content->next_tag( [ 'tag_name' => 'input', 'class_name' => 'wp-block-search__input' ] );
	$block_content->set_attribute( 'name', $query_var );
	$block_content->set_attribute( 'inputmode', 'search' );
	$block_content->set_attribute( 'value', $value );
	$block_content->set_attribute( 'data-wp-bind--value', 'state.searchValue' );
	$block_content->set_attribute( 'data-wp-on--input', 'actions.search' );

	return (string) $block_content;
}

/**
 * Add data attributes to the query block to describe the block query.
 *
 * @param string    $block_content Default query content.
 * @param array     $block         Parsed block.
 * @return string
 */
function render_block_query( $block_content, $block ) {
	$block_content = new WP_HTML_Tag_Processor( $block_content );
	$block_content->next_tag();

	$query_id = $block['attrs']['queryId'] ?? 0;

	// Always allow region updates on interactivity, use standard core region naming.
	$block_content->set_attribute( 'data-wp-interactive', 'query-filter' );
	$block_content->set_attribute( 'data-wp-router-region', 'query-' . $query_id );

	// Expose the stable block ID for connected filter blocks.
	$anchor    = $block['attrs']['anchor'] ?? '';
	$stable_id = $anchor ?: 'query-' . $query_id;
	$block_content->set_attribute( 'data-qf-block-id', esc_attr( sanitize_key( $stable_id ) ) );

	return (string) $block_content;
}

/**
 * Extract qf-{stableId}-{taxonomy} GET params as a tax_query array.
 *
 * Scans $_GET for params matching a given stable ID prefix and builds
 * the corresponding WP_Query-compatible tax_query entries.
 *
 * @param string $stable_id The sanitized stable ID for the target block.
 * @return array Tax query entries (empty if no matching params found).
 */
function get_qf_tax_query_for_stable_id( string $stable_id ) : array {
	$prefix = 'qf-' . $stable_id . '-';
	$tax_query = [];

	foreach ( $_GET as $key => $value ) {
		if ( strpos( $key, $prefix ) === 0 ) {
			$param_key = sanitize_key( str_replace( $prefix, '', $key ) );
			$value     = sanitize_text_field( urldecode( wp_unslash( $value ) ) );

			// Skip the search param — handled separately by get_qf_search_for_stable_id().
			if ( $param_key === 's' ) {
				continue;
			}

			if ( $param_key && get_taxonomy( $param_key ) && ! empty( $value ) ) {
				$tax_query[] = [
					'taxonomy' => $param_key,
					'terms'    => [ $value ],
					'field'    => 'slug',
				];
			}
		}
	}

	return $tax_query;
}

/**
 * Extract the qf-{stableId}-s search GET param value.
 *
 * @param string $stable_id The sanitized stable ID for the target block.
 * @return string The search value, or empty string if not set.
 */
function get_qf_search_for_stable_id( string $stable_id ) : string {
	$key = 'qf-' . $stable_id . '-s';

	if ( isset( $_GET[ $key ] ) ) {
		return sanitize_text_field( urldecode( wp_unslash( $_GET[ $key ] ) ) );
	}

	return '';
}

/**
 * Merge a qf tax_query into existing query args.
 *
 * @param array $args      Existing WP_Query args.
 * @param array $qf_taxes  Tax query entries from get_qf_tax_query_for_stable_id().
 * @return array Modified args with tax_query merged.
 */
function merge_qf_tax_query( array $args, array $qf_taxes ) : array {
	if ( empty( $qf_taxes ) ) {
		return $args;
	}

	$qf_taxes['relation'] = 'AND';
	$existing = $args['tax_query'] ?? [];

	if ( ! empty( $existing ) ) {
		$args['tax_query'] = [
			'relation' => 'AND',
			$existing,
			$qf_taxes,
		];
	} else {
		$args['tax_query'] = $qf_taxes;
	}

	return $args;
}

/**
 * Apply qf-* params to GreenShift/third-party query args.
 *
 * Shared logic for both hook variants. Uses a flag in $args to
 * prevent double-filtering when both hooks fire.
 *
 * @param array  $args      WP_Query args.
 * @param string $stable_id Sanitized stable block ID.
 * @return array Modified args.
 */
function apply_qf_to_query_args( array $args, string $stable_id ) : array {
	if ( empty( $stable_id ) || ! empty( $args['_qf_filtered'] ) ) {
		return $args;
	}

	$args['_qf_filtered'] = true;

	$qf_taxes = get_qf_tax_query_for_stable_id( $stable_id );
	$args     = merge_qf_tax_query( $args, $qf_taxes );

	$search = get_qf_search_for_stable_id( $stable_id );
	if ( ! empty( $search ) ) {
		$args['s'] = $search;
	}

	return $args;
}

/**
 * Filter GreenShift query args via `gspb_module_args_query_id`.
 *
 * Receives the query args and the GreenShift block's `id` attribute.
 *
 * @param array      $args     WP_Query args built by GreenShift.
 * @param string|int $block_id The GreenShift block's `id` attribute.
 * @return array Modified args.
 */
function filter_greenshift_query_args( array $args, $block_id ) : array {
	$stable_id = sanitize_key( (string) $block_id );
	return apply_qf_to_query_args( $args, $stable_id );
}

/**
 * Filter Blocksy query args to inject qf-* taxonomy params.
 *
 * Hooks into `blocksy:general:blocks:query:args` which receives the query
 * args and the block's attributes array. Blocksy uses `uniqueId`.
 *
 * @param array $args       WP_Query args built by Blocksy.
 * @param array $attributes The Blocksy block's attributes.
 * @return array Modified args.
 */
function filter_blocksy_query_args( array $args, $attributes ) : array {
	$unique_id = sanitize_key( $attributes['uniqueId'] ?? '' );
	return apply_qf_to_query_args( $args, $unique_id );
}
