/**
 * Scoped Taxonomy Select control.
 *
 * Shows only taxonomies relevant to the connected query block's
 * post type and existing tax query constraints.
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { SelectControl, ToggleControl } from '@wordpress/components';
import { useMemo, useEffect } from '@wordpress/element';
import { getAdapter } from '../query-adapters';

export default function ScopedTaxonomySelect( {
	attributes,
	setAttributes,
	context,
} ) {
	const { taxonomy, targetBlockId, showAllTaxonomies } = attributes;

	// Find the connected block in the editor
	const connectedBlock = useSelect(
		( select ) => {
			if ( ! targetBlockId ) {
				return null;
			}

			const { getBlocks } = select( blockEditorStore );

			function findBlock( blocks ) {
				for ( const block of blocks ) {
					const adapter = getAdapter( block );
					if ( adapter ) {
						const stableId = adapter.getStableId( block );
						if (
							stableId === targetBlockId ||
							block.clientId === targetBlockId
						) {
							return block;
						}
					}
					if ( block.innerBlocks?.length ) {
						const found = findBlock( block.innerBlocks );
						if ( found ) {
							return found;
						}
					}
				}
				return null;
			}

			return findBlock( getBlocks() );
		},
		[ targetBlockId ]
	);

	// Extract query info from connected block or block context
	const queryInfo = useMemo( () => {
		if ( connectedBlock ) {
			const adapter = getAdapter( connectedBlock );
			if ( adapter ) {
				return adapter.extractQuery( connectedBlock );
			}
		}

		// Fall back to block context (when inside core/query)
		if ( context?.query ) {
			const query = context.query;
			const taxQuery = query.taxQuery || null;
			return {
				postType: query.postType || 'post',
				taxQuery,
				taxonomiesInUse: taxQuery
					? Object.keys( taxQuery ).filter(
							( k ) => k !== 'relation'
					  )
					: [],
			};
		}

		return null;
	}, [ connectedBlock, context ] );

	// Fetch all taxonomies from the WP data store
	const allTaxonomies = useSelect( ( select ) => {
		return select( 'core' ).getTaxonomies( { per_page: 100 } ) || [];
	}, [] );

	// Filter taxonomies based on query info
	const filteredTaxonomies = useMemo( () => {
		if ( ! allTaxonomies.length ) {
			return [];
		}

		// Start with publicly queryable taxonomies
		let filtered = allTaxonomies.filter(
			( tax ) => tax.visibility?.publicly_queryable
		);

		// Scope to post type if known
		if ( queryInfo?.postType ) {
			const postTypes = queryInfo.postType
				.split( ',' )
				.map( ( pt ) => pt.trim() );
			filtered = filtered.filter( ( tax ) =>
				tax.types?.some( ( type ) => postTypes.includes( type ) )
			);
		}

		// If the connected query has tax constraints and toggle is off,
		// only show taxonomies already in the tax query
		if (
			! showAllTaxonomies &&
			queryInfo?.taxonomiesInUse?.length > 0
		) {
			filtered = filtered.filter( ( tax ) =>
				queryInfo.taxonomiesInUse.includes( tax.slug )
			);
		}

		return filtered;
	}, [ allTaxonomies, queryInfo, showAllTaxonomies ] );

	// Effective list: scoped if we have results, else all public
	const effectiveTaxonomies =
		filteredTaxonomies.length > 0
			? filteredTaxonomies
			: allTaxonomies.filter(
					( tax ) => tax.visibility?.publicly_queryable
			  );

	// Auto-select first taxonomy if none selected
	useEffect( () => {
		if ( effectiveTaxonomies.length > 0 && ! taxonomy ) {
			setAttributes( {
				taxonomy: effectiveTaxonomies[ 0 ].slug,
				label: effectiveTaxonomies[ 0 ].name,
			} );
		}
	}, [ effectiveTaxonomies, taxonomy ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const hasTaxQueryConstraints = queryInfo?.taxonomiesInUse?.length > 0;

	return (
		<>
			<SelectControl
				label={ __( 'Select Taxonomy', 'query-filter' ) }
				value={ taxonomy }
				options={ effectiveTaxonomies.map( ( tax ) => ( {
					label: tax.name,
					value: tax.slug,
				} ) ) }
				onChange={ ( newTaxonomy ) => {
					const taxObj = effectiveTaxonomies.find(
						( t ) => t.slug === newTaxonomy
					);
					setAttributes( {
						taxonomy: newTaxonomy,
						label: taxObj ? taxObj.name : newTaxonomy,
					} );
				} }
			/>
			{ hasTaxQueryConstraints && (
				<ToggleControl
					label={ __(
						'Show all taxonomies for this post type',
						'query-filter'
					) }
					checked={ showAllTaxonomies }
					onChange={ ( value ) =>
						setAttributes( { showAllTaxonomies: value } )
					}
					help={ __(
						'When off, only taxonomies already used in the connected query are shown.',
						'query-filter'
					) }
				/>
			) }
		</>
	);
}
