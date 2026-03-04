<?php
/**
 * Taxonomy Filter block server-side render.
 *
 * Supports three scenarios:
 * 1. Inside a core Query Loop (backward compatible, uses queryId context)
 * 2. Connected to an external query block via targetBlockId
 * 3. Manual mode with user-specified taxonomy slug and term IDs
 *
 * @package query-filter
 */

// Determine mode.
$mode            = $attributes['mode'] ?? 'auto';
$target_block_id = $attributes['targetBlockId'] ?? '';
$target_block_type = $attributes['targetBlockType'] ?? '';

// Inherit connection from Filter Group container when not explicitly set.
if ( empty( $target_block_id ) && ! empty( $block->context['query-filter/targetBlockId'] ) ) {
	$target_block_id   = $block->context['query-filter/targetBlockId'];
	$target_block_type = $block->context['query-filter/targetBlockType'] ?? '';
}

// Determine if connected to a core/query block (supports Interactivity API navigation)
// or a third-party block (needs partial AJAX refresh).
$is_core_query = empty( $target_block_id )
	? ( ! empty( $block->context['query'] ) ) // Inside core Query Loop context
	: ( $target_block_type === 'core/query' );

// --- Resolve taxonomy slug ---
if ( $mode === 'manual' ) {
	$taxonomy_slug   = sanitize_key( $attributes['manualTaxonomy'] ?? '' );
	$manual_term_ids = array_filter(
		array_map( 'absint', explode( ',', $attributes['manualTermIds'] ?? '' ) )
	);

	if ( empty( $taxonomy_slug ) || empty( $manual_term_ids ) ) {
		return;
	}

	$taxonomy = get_taxonomy( $taxonomy_slug );
	if ( ! $taxonomy ) {
		return;
	}
} else {
	if ( empty( $attributes['taxonomy'] ) ) {
		return;
	}

	$taxonomy_slug = $attributes['taxonomy'];
	$taxonomy      = get_taxonomy( $taxonomy_slug );

	if ( ! $taxonomy ) {
		return;
	}
}

$id = 'query-filter-' . wp_generate_uuid4();

// --- Determine URL param name based on connection type ---
if ( ! empty( $target_block_id ) ) {
	// Connected to an external block (core or third-party).
	$safe_id   = sanitize_key( $target_block_id );
	$query_var = sprintf( 'qf-%s-%s', $safe_id, $taxonomy_slug );
	$page_var  = sprintf( 'qf-%s-page', $safe_id );
	$base_url  = remove_query_arg( [ $query_var, $page_var ] );

} elseif ( ! empty( $block->context['query'] ) ) {
	// Inside a core Query block (backward compat).
	if ( empty( $block->context['query']['inherit'] ) ) {
		$query_id  = $block->context['queryId'] ?? 0;
		$query_var = sprintf( 'query-%d-%s', $query_id, $taxonomy_slug );
		$page_var  = isset( $block->context['queryId'] )
			? 'query-' . $block->context['queryId'] . '-page'
			: 'query-page';
		$base_url  = remove_query_arg( [ $query_var, $page_var ] );
	} else {
		$query_var = sprintf( 'query-%s', $taxonomy_slug );
		$page_var  = 'page';
		$base_url  = str_replace(
			'/page/' . get_query_var( 'paged' ),
			'',
			remove_query_arg( [ $query_var, $page_var ] )
		);
	}

} else {
	// Fallback: generic filter (targets the main query).
	$query_var = sprintf( 'qf-0-%s', $taxonomy_slug );
	$page_var  = 'page';
	$base_url  = str_replace(
		'/page/' . get_query_var( 'paged' ),
		'',
		remove_query_arg( [ $query_var, $page_var ] )
	);
}

// --- Load terms ---
if ( $mode === 'manual' ) {
	$terms = get_terms( [
		'taxonomy'   => $taxonomy_slug,
		'include'    => $manual_term_ids,
		'hide_empty' => false,
		'number'     => 100,
	] );
} else {
	$terms = get_terms( [
		'hide_empty' => true,
		'taxonomy'   => $taxonomy_slug,
		'number'     => 100,
	] );
}

if ( is_wp_error( $terms ) || empty( $terms ) ) {
	return;
}
?>

<?php
$qf_context = wp_json_encode( [
	'targetBlockId' => sanitize_key( $target_block_id ),
	'isCore'        => $is_core_query,
] );

$display_mode   = $attributes['displayMode'] ?? 'dropdown';
$current_value  = wp_unslash( $_GET[ $query_var ] ?? '' );
$label_text     = $attributes['label'] ?? $taxonomy->label;
$empty_label    = $attributes['emptyLabel'] ?: __( 'All', 'query-filter' );
$show_label_cls = $attributes['showLabel'] ? '' : ' screen-reader-text';
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter wp-block-query-filter--' . esc_attr( $display_mode ) ] ); ?> data-wp-interactive="query-filter" data-wp-context="<?php echo esc_attr( $qf_context ); ?>">
	<label class="wp-block-query-filter-taxonomy__label wp-block-query-filter__label<?php echo $show_label_cls; ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $label_text ); ?>
	</label>

	<?php if ( $display_mode === 'buttons' ) : ?>
		<div class="wp-block-query-filter-taxonomy__choices" role="radiogroup" aria-label="<?php echo esc_attr( $label_text ); ?>">
			<a
				href="<?php echo esc_attr( $base_url ); ?>"
				class="wp-block-query-filter-taxonomy__choice<?php echo empty( $current_value ) ? ' is-active' : ''; ?>"
				role="radio"
				aria-checked="<?php echo empty( $current_value ) ? 'true' : 'false'; ?>"
				data-wp-on--click="actions.navigate"
			><?php echo esc_html( $empty_label ); ?></a>
			<?php foreach ( $terms as $term ) :
				$is_active = ( $term->slug === $current_value );
				$term_url  = add_query_arg( [ $query_var => $term->slug, $page_var => false ], $base_url );
			?>
				<a
					href="<?php echo esc_attr( $term_url ); ?>"
					class="wp-block-query-filter-taxonomy__choice<?php echo $is_active ? ' is-active' : ''; ?>"
					role="radio"
					aria-checked="<?php echo $is_active ? 'true' : 'false'; ?>"
					data-wp-on--click="actions.navigate"
				><?php echo esc_html( $term->name ); ?></a>
			<?php endforeach; ?>
		</div>
	<?php else : ?>
		<select class="wp-block-query-filter-taxonomy__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
			<option value="<?php echo esc_attr( $base_url ); ?>"><?php echo esc_html( $empty_label ); ?></option>
			<?php foreach ( $terms as $term ) : ?>
				<option value="<?php echo esc_attr( add_query_arg( [ $query_var => $term->slug, $page_var => false ], $base_url ) ); ?>" <?php selected( $term->slug, $current_value ); ?>><?php echo esc_html( $term->name ); ?></option>
			<?php endforeach; ?>
		</select>
	<?php endif; ?>
</div>
