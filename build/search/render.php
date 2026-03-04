<?php
/**
 * Search Filter block server-side render.
 *
 * Supports three scenarios:
 * 1. Inside a core Query Loop (backward compatible, uses queryId context)
 * 2. Connected to an external query block via targetBlockId
 * 3. Standalone (targets the main query)
 *
 * @package query-filter
 */

$target_block_id   = $attributes['targetBlockId'] ?? '';
$target_block_type = $attributes['targetBlockType'] ?? '';

// Inherit connection from Filter Group container when not explicitly set.
if ( empty( $target_block_id ) && ! empty( $block->context['query-filter/targetBlockId'] ) ) {
	$target_block_id   = $block->context['query-filter/targetBlockId'];
	$target_block_type = $block->context['query-filter/targetBlockType'] ?? '';
}

// Determine navigation mode: core → Interactivity Router, third-party → partial AJAX refresh.
$is_core_query = empty( $target_block_id )
	? ( ! empty( $block->context['query'] ) )
	: ( $target_block_type === 'core/query' );

$id = 'query-filter-search-' . wp_generate_uuid4();

// --- Determine URL param name based on connection type ---
if ( ! empty( $target_block_id ) ) {
	// Connected to an external block (core or third-party).
	$safe_id   = sanitize_key( $target_block_id );
	$query_var = sprintf( 'qf-%s-s', $safe_id );
	$page_var  = sprintf( 'qf-%s-page', $safe_id );
	$base_url  = remove_query_arg( [ $query_var, $page_var ] );

} elseif ( ! empty( $block->context['query'] ) ) {
	// Inside a core Query block (backward compat).
	if ( empty( $block->context['query']['inherit'] ) ) {
		$query_id  = $block->context['queryId'] ?? 0;
		$query_var = sprintf( 'query-%d-s', $query_id );
		$page_var  = isset( $block->context['queryId'] )
			? 'query-' . $block->context['queryId'] . '-page'
			: 'query-page';
		$base_url  = remove_query_arg( [ $query_var, $page_var ] );
	} else {
		$query_var = 'query-s';
		$page_var  = 'page';
		$base_url  = str_replace(
			'/page/' . get_query_var( 'paged' ),
			'',
			remove_query_arg( [ $query_var, $page_var ] )
		);
	}

} else {
	// Fallback: generic filter (targets the main query).
	$query_var = 'qf-0-s';
	$page_var  = 'page';
	$base_url  = str_replace(
		'/page/' . get_query_var( 'paged' ),
		'',
		remove_query_arg( [ $query_var, $page_var ] )
	);
}

// Sanitize the current search value.
$value = wp_unslash( $_GET[ $query_var ] ?? '' );
$value = urldecode( $value );
$value = wp_check_invalid_utf8( $value );
$value = wp_pre_kses_less_than( $value );
$value = strip_tags( $value );

$placeholder = $attributes['placeholder'] ?: __( 'Search…', 'query-filter' );
$label_text  = $attributes['label'] ?? __( 'Search', 'query-filter' );

wp_interactivity_state( 'query-filter', [
	'searchValue' => $value,
] );

$qf_context = wp_json_encode( [
	'targetBlockId' => sanitize_key( $target_block_id ),
	'isCore'        => $is_core_query,
] );
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter wp-block-query-filter-search' ] ); ?> data-wp-interactive="query-filter" data-wp-context="<?php echo esc_attr( $qf_context ); ?>">
	<form method="get" action="<?php echo esc_attr( $base_url ); ?>" data-wp-on--submit="actions.qfSearch">
		<label class="wp-block-query-filter-search__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text'; ?>" for="<?php echo esc_attr( $id ); ?>">
			<?php echo esc_html( $label_text ); ?>
		</label>
		<input
			type="search"
			id="<?php echo esc_attr( $id ); ?>"
			class="wp-block-query-filter-search__input wp-block-query-filter__input"
			name="<?php echo esc_attr( $query_var ); ?>"
			placeholder="<?php echo esc_attr( $placeholder ); ?>"
			value="<?php echo esc_attr( $value ); ?>"
			data-wp-bind--value="state.searchValue"
			data-wp-on--input="actions.qfSearch"
		/>
	</form>
</div>
