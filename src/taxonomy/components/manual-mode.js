/**
 * Manual Mode controls.
 *
 * Allows the user to manually specify a taxonomy slug and term IDs
 * when automatic detection is not possible or fails.
 */
import { __ } from '@wordpress/i18n';
import { TextControl, Notice } from '@wordpress/components';

export default function ManualMode( { attributes, setAttributes } ) {
	const { manualTaxonomy, manualTermIds } = attributes;

	// Validate taxonomy slug (sanitize_key style)
	const isTaxonomyValid =
		! manualTaxonomy || /^[a-z0-9_-]+$/.test( manualTaxonomy );

	// Validate term IDs
	const termIdsArray = ( manualTermIds || '' )
		.split( ',' )
		.map( ( id ) => id.trim() )
		.filter( Boolean );
	const validTermIds = termIdsArray.filter( ( id ) => /^\d+$/.test( id ) );
	const hasInvalidTermIds =
		termIdsArray.length > 0 &&
		validTermIds.length !== termIdsArray.length;

	return (
		<>
			<TextControl
				label={ __( 'Taxonomy Slug', 'query-filter' ) }
				value={ manualTaxonomy || '' }
				placeholder={ __( 'e.g. category, post_tag', 'query-filter' ) }
				help={ __(
					'Enter the taxonomy slug (lowercase letters, numbers, dashes, underscores).',
					'query-filter'
				) }
				onChange={ ( value ) =>
					setAttributes( {
						manualTaxonomy: value
							.toLowerCase()
							.replace( /[^a-z0-9_-]/g, '' ),
					} )
				}
			/>
			{ manualTaxonomy && ! isTaxonomyValid && (
				<Notice status="error" isDismissible={ false }>
					{ __(
						'Invalid taxonomy slug. Use only lowercase letters, numbers, dashes, and underscores.',
						'query-filter'
					) }
				</Notice>
			) }
			<TextControl
				label={ __( 'Term IDs', 'query-filter' ) }
				value={ manualTermIds || '' }
				placeholder={ __( 'e.g. 12, 18, 44', 'query-filter' ) }
				help={ __(
					'Enter comma-separated term IDs to display as filter options.',
					'query-filter'
				) }
				onChange={ ( value ) =>
					setAttributes( { manualTermIds: value } )
				}
			/>
			{ hasInvalidTermIds && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'Some term IDs are not valid integers and will be ignored.',
						'query-filter'
					) }
				</Notice>
			) }
		</>
	);
}
