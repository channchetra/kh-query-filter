<?php
/**
 * Filter Group block server-side render.
 *
 * Simple wrapper that renders inner blocks. Provides targetBlockId
 * and targetBlockType context to child filter blocks.
 *
 * @package query-filter
 */
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter-group' ] ); ?>>
	<?php echo $content; ?>
</div>
