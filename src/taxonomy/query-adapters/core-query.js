/**
 * Core Query block adapter.
 *
 * Handles core/query blocks and extracts query settings
 * from standard WordPress Query Loop attributes.
 */
const CoreQueryAdapter = {
	blockNames: [ 'core/query' ],

	supports( block ) {
		return this.blockNames.includes( block.name );
	},

	getStableId( block ) {
		if ( block.attributes.anchor ) {
			return block.attributes.anchor;
		}
		if ( block.attributes.queryId !== undefined ) {
			return 'query-' + block.attributes.queryId;
		}
		return null;
	},

	extractQuery( block ) {
		const query = block.attributes.query || {};
		const taxQuery = query.taxQuery || null;

		return {
			postType: query.postType || 'post',
			taxQuery,
			taxonomiesInUse: taxQuery
				? Object.keys( taxQuery ).filter( ( k ) => k !== 'relation' )
				: [],
		};
	},

	getLabel( block ) {
		const queryId = block.attributes.queryId;
		const anchor = block.attributes.anchor;
		let suffix = '';
		if ( anchor ) {
			suffix = ` (#${ anchor })`;
		} else if ( queryId !== undefined ) {
			suffix = ` (ID: ${ queryId })`;
		}
		return `Query Loop${ suffix }`;
	},
};

export default CoreQueryAdapter;
