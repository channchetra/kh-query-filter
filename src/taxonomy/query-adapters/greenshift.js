/**
 * GreenShift / GreenLight query block adapter.
 *
 * Maps to the actual GreenShift querygrid block which registers as
 * `greenshift-blocks/querygrid`. The block uses an `id` attribute
 * for its container element (`gspb_filterid_{id}`), and stores
 * post type in `post_type`, taxonomy in `tax_name`/`tax_slug`.
 *
 * Server-side filtering is handled via the `gspb_module_args_query`
 * and `gspb_module_args_query_id` filters in GreenShift.
 */
const GreenShiftAdapter = {
	blockNames: [ 'greenshift-blocks/querygrid' ],

	supports( block ) {
		return this.blockNames.includes( block.name );
	},

	getStableId( block ) {
		// GreenShift uses `id` attribute as the block's unique identifier.
		// This maps to the container element `gspb_filterid_{id}`.
		if ( block.attributes.anchor ) {
			return block.attributes.anchor;
		}
		if ( block.attributes.id ) {
			return String( block.attributes.id );
		}
		return null;
	},

	extractQuery( block ) {
		const attrs = block.attributes || {};

		// GreenShift stores post type in `post_type` (or falls back to `type`).
		const postType = attrs.post_type || attrs.type || 'post';

		let taxQuery = null;
		let taxonomiesInUse = [];

		// GreenShift uses `tax_name` + `tax_slug` for a single taxonomy filter,
		// and `cat`/`tag` for category/tag term IDs.
		if ( attrs.tax_name && attrs.tax_slug ) {
			taxQuery = {
				[ attrs.tax_name ]: attrs.tax_slug
					.split( ',' )
					.map( ( s ) => s.trim() ),
			};
			taxonomiesInUse = [ attrs.tax_name ];
		} else {
			if ( attrs.cat ) {
				taxonomiesInUse.push(
					postType === 'product' ? 'product_cat' : 'category'
				);
			}
			if ( attrs.tag ) {
				taxonomiesInUse.push(
					postType === 'product' ? 'product_tag' : 'post_tag'
				);
			}
		}

		return { postType, taxQuery, taxonomiesInUse };
	},

	getLabel( block ) {
		const anchor = block.attributes?.anchor;
		const id = block.attributes?.id;
		let suffix = '';
		if ( anchor ) {
			suffix = ` (#${ anchor })`;
		} else if ( id ) {
			suffix = ` (${ id })`;
		}
		return `GreenShift Query${ suffix }`;
	},
};

export default GreenShiftAdapter;
