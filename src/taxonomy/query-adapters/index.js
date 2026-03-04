/**
 * Query Adapter registry.
 *
 * Provides utilities to find, match, and extract query information
 * from various query-type blocks in the editor.
 */
import CoreQueryAdapter from './core-query';
import GreenShiftAdapter from './greenshift';
import BlocksyAdapter from './blocksy';

const adapters = [ CoreQueryAdapter, GreenShiftAdapter, BlocksyAdapter ];

/**
 * Generic adapter for unrecognized query-like blocks.
 * Used as a fallback when a block has query-like attributes
 * but no specific adapter is registered.
 */
const GenericAdapter = {
	getStableId( block ) {
		if ( block.attributes.anchor ) {
			return block.attributes.anchor;
		}
		if ( block.attributes.blockId ) {
			return block.attributes.blockId;
		}
		if ( block.attributes.uniqueId ) {
			return block.attributes.uniqueId;
		}
		return null;
	},

	extractQuery( block ) {
		const attrs = block.attributes || {};
		const query = attrs.query || {};
		const postType =
			query.postType || attrs.postType || attrs.post_type || 'post';
		const taxQuery =
			query.taxQuery || attrs.taxQuery || attrs.tax_query || null;

		let taxonomiesInUse = [];
		if ( taxQuery ) {
			if ( Array.isArray( taxQuery ) ) {
				taxonomiesInUse = taxQuery
					.map( ( q ) => q.taxonomy )
					.filter( Boolean );
			} else {
				taxonomiesInUse = Object.keys( taxQuery ).filter(
					( k ) => k !== 'relation'
				);
			}
		}

		return { postType, taxQuery, taxonomiesInUse };
	},

	getLabel( block ) {
		const anchor = block.attributes?.anchor;
		return `${ block.name }${ anchor ? ` (#${ anchor })` : '' }`;
	},
};

/**
 * Find the specific adapter that supports a given block.
 *
 * @param {Object} block Block object with name and attributes.
 * @return {Object|null} Adapter or null.
 */
export function findAdapter( block ) {
	return adapters.find( ( adapter ) => adapter.supports( block ) ) || null;
}

/**
 * Get all block names that registered adapters know about.
 *
 * @return {string[]} Array of block names.
 */
export function getAllSupportedBlockNames() {
	return adapters.flatMap( ( adapter ) => adapter.blockNames );
}

/**
 * Check if a block looks like a query block (has query-like attributes).
 *
 * @param {Object} block Block object.
 * @return {boolean} True if the block appears to be a query block.
 */
export function isQueryLikeBlock( block ) {
	if ( findAdapter( block ) ) {
		return true;
	}

	const attrs = block.attributes || {};
	return (
		attrs.query !== undefined ||
		attrs.postType !== undefined ||
		attrs.post_type !== undefined ||
		attrs.taxQuery !== undefined ||
		attrs.tax_query !== undefined
	);
}

/**
 * Get an adapter for a block, falling back to GenericAdapter
 * if the block looks like a query block.
 *
 * @param {Object} block Block object.
 * @return {Object|null} Adapter or null.
 */
export function getAdapter( block ) {
	const specific = findAdapter( block );
	if ( specific ) {
		return specific;
	}
	if ( isQueryLikeBlock( block ) ) {
		return GenericAdapter;
	}
	return null;
}

/**
 * Recursively scan all blocks and find query block candidates.
 *
 * @param {Object[]} blocks Array of blocks from the editor store.
 * @return {Object[]} Array of candidate objects with block, adapter, stableId, label, clientId.
 */
export function findQueryBlocks( blocks ) {
	const candidates = [];

	function scan( blockList ) {
		for ( const block of blockList ) {
			const adapter = getAdapter( block );
			if ( adapter ) {
				candidates.push( {
					block,
					adapter,
					stableId: adapter.getStableId( block ),
					label: adapter.getLabel( block ),
					clientId: block.clientId,
				} );
			}
			if ( block.innerBlocks && block.innerBlocks.length ) {
				scan( block.innerBlocks );
			}
		}
	}

	scan( blocks );
	return candidates;
}

export { adapters, GenericAdapter };
