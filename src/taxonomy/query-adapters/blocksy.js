/**
 * Blocksy Advanced Posts adapter.
 *
 * Maps to the actual Blocksy query block registered as `blocksy/query`.
 * The block uses a `uniqueId` attribute as its identifier and stores
 * post type in `post_type`, taxonomy include/exclude in
 * `include_term_ids` / `exclude_term_ids`.
 *
 * Server-side filtering is handled via `blocksy:general:blocks:query:args`
 * filter in the Blocksy companion plugin.
 */
const BlocksyAdapter = {
	blockNames: [ 'blocksy/query' ],

	supports( block ) {
		return this.blockNames.includes( block.name );
	},

	getStableId( block ) {
		if ( block.attributes.anchor ) {
			return block.attributes.anchor;
		}
		// Blocksy uses `uniqueId` as the block's identifier.
		if ( block.attributes.uniqueId ) {
			return block.attributes.uniqueId;
		}
		return null;
	},

	extractQuery( block ) {
		const attrs = block.attributes || {};

		// Blocksy stores post_type as a comma-separated string.
		const postType = attrs.post_type || 'post';

		let taxonomiesInUse = [];

		// Blocksy uses include_term_ids / exclude_term_ids objects keyed by taxonomy slug.
		// Each value is { strategy: 'all'|'specific'|'related', terms: [...] }.
		if ( attrs.include_term_ids ) {
			const included = Object.entries(
				attrs.include_term_ids
			).filter(
				( [ , desc ] ) =>
					desc.strategy !== 'all' && desc.terms?.length > 0
			);
			taxonomiesInUse.push(
				...included.map( ( [ taxSlug ] ) => taxSlug )
			);
		}

		if ( attrs.exclude_term_ids ) {
			const excluded = Object.entries(
				attrs.exclude_term_ids
			).filter(
				( [ , desc ] ) =>
					desc.strategy !== 'all' && desc.terms?.length > 0
			);
			taxonomiesInUse.push(
				...excluded.map( ( [ taxSlug ] ) => taxSlug )
			);
		}

		// Deduplicate.
		taxonomiesInUse = [ ...new Set( taxonomiesInUse ) ];

		return { postType, taxQuery: null, taxonomiesInUse };
	},

	getLabel( block ) {
		const anchor = block.attributes?.anchor;
		const id = block.attributes?.uniqueId;
		let suffix = '';
		if ( anchor ) {
			suffix = ` (#${ anchor })`;
		} else if ( id ) {
			suffix = ` (${ id })`;
		}
		return `Blocksy Posts${ suffix }`;
	},
};

export default BlocksyAdapter;
