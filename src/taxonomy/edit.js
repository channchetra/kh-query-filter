import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	Notice,
	ButtonGroup,
	Button,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';

import BlockConnection from './components/block-connection';
import ScopedTaxonomySelect from './components/scoped-taxonomy-select';
import ManualMode from './components/manual-mode';

export default function Edit( { attributes, setAttributes, context } ) {
	const {
		taxonomy,
		emptyLabel,
		label,
		showLabel,
		targetBlockId,
		mode,
		manualTaxonomy,
		manualTermIds,
		displayMode,
	} = attributes;

	const isManualMode = mode === 'manual';
	const isButtonsMode = displayMode === 'buttons';
	const hasQueryContext =
		context?.queryId !== undefined || !! context?.query;
	const hasContainerConnection =
		! targetBlockId && !! context?.[ 'query-filter/targetBlockId' ];
	const isConnected =
		!! targetBlockId || hasQueryContext || hasContainerConnection;

	// Determine effective taxonomy for display
	const effectiveTaxonomy = isManualMode ? manualTaxonomy : taxonomy;

	// Fetch terms for the editor preview
	const terms = useSelect(
		( select ) => {
			if ( ! effectiveTaxonomy ) {
				return [];
			}

			const queryArgs =
				isManualMode && manualTermIds
					? {
							include: manualTermIds
								.split( ',' )
								.map( ( id ) =>
									parseInt( id.trim(), 10 )
								)
								.filter( Boolean ),
							per_page: 100,
					  }
					: { per_page: 50 };

			return (
				select( 'core' ).getEntityRecords(
					'taxonomy',
					effectiveTaxonomy,
					queryArgs
				) || []
			);
		},
		[ effectiveTaxonomy, isManualMode, manualTermIds ]
	);

	// Suggest manual mode if completely unconnected
	const shouldSuggestManual = ! isConnected && ! isManualMode;

	return (
		<>
			<InspectorControls>
				<BlockConnection
					attributes={ attributes }
					setAttributes={ setAttributes }
					context={ context }
				/>

				<PanelBody
					title={ __( 'Mode', 'query-filter' ) }
					initialOpen={ true }
				>
					<ToggleControl
						label={ __( 'Manual Mode', 'query-filter' ) }
						checked={ isManualMode }
						onChange={ ( value ) =>
							setAttributes( {
								mode: value ? 'manual' : 'auto',
							} )
						}
						help={
							isManualMode
								? __(
										'Manually specify taxonomy and term IDs.',
										'query-filter'
								  )
								: __(
										'Automatically detect taxonomies from the connected query.',
										'query-filter'
								  )
						}
					/>
					{ shouldSuggestManual && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'No query block connection detected. Connect to a query block above, or switch to manual mode.',
								'query-filter'
							) }
						</Notice>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Display', 'query-filter' ) }
					initialOpen={ true }
				>
					<div style={ { marginBottom: '8px' } }>
						<span
							className="components-base-control__label"
							style={ {
								display: 'block',
								marginBottom: '4px',
							} }
						>
							{ __( 'Display Mode', 'query-filter' ) }
						</span>
						<ButtonGroup>
							<Button
								variant={
									! isButtonsMode
										? 'primary'
										: 'secondary'
								}
								onClick={ () =>
									setAttributes( {
										displayMode: 'dropdown',
									} )
								}
								size="compact"
							>
								{ __( 'Dropdown', 'query-filter' ) }
							</Button>
							<Button
								variant={
									isButtonsMode
										? 'primary'
										: 'secondary'
								}
								onClick={ () =>
									setAttributes( {
										displayMode: 'buttons',
									} )
								}
								size="compact"
							>
								{ __( 'Buttons', 'query-filter' ) }
							</Button>
						</ButtonGroup>
					</div>
				</PanelBody>

				<PanelBody
					title={ __( 'Taxonomy Settings', 'query-filter' ) }
				>
					{ isManualMode ? (
						<ManualMode
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
					) : (
						<ScopedTaxonomySelect
							attributes={ attributes }
							setAttributes={ setAttributes }
							context={ context }
						/>
					) }
					<TextControl
						label={ __( 'Label', 'query-filter' ) }
						value={ label }
						help={ __(
							'If empty then no label will be shown',
							'query-filter'
						) }
						onChange={ ( newLabel ) =>
							setAttributes( { label: newLabel } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Label', 'query-filter' ) }
						checked={ showLabel }
						onChange={ ( newShowLabel ) =>
							setAttributes( { showLabel: newShowLabel } )
						}
					/>
					<TextControl
						label={ __(
							'Empty Choice Label',
							'query-filter'
						) }
						value={ emptyLabel }
						placeholder={ __( 'All', 'query-filter' ) }
						onChange={ ( newEmptyLabel ) =>
							setAttributes( { emptyLabel: newEmptyLabel } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div
				{ ...useBlockProps( {
					className: `wp-block-query-filter wp-block-query-filter--${ displayMode || 'dropdown' }`,
				} ) }
			>
				{ shouldSuggestManual && (
					<div
						className="wp-block-query-filter__warning"
						style={ {
							padding: '8px 12px',
							backgroundColor: '#fcf0e3',
							borderLeft: '4px solid #dba617',
							marginBottom: '8px',
							fontSize: '13px',
						} }
					>
						{ __(
							'Not connected to a query block. Connect a block or use manual mode.',
							'query-filter'
						) }
					</div>
				) }
				{ showLabel && (
					<label className="wp-block-query-filter-taxonomy__label wp-block-query-filter__label">
						{ label ||
							effectiveTaxonomy ||
							__( 'Taxonomy', 'query-filter' ) }
					</label>
				) }
				{ isButtonsMode ? (
					<div className="wp-block-query-filter-taxonomy__choices">
						<span className="wp-block-query-filter-taxonomy__choice is-active">
							{ emptyLabel ||
								__( 'All', 'query-filter' ) }
						</span>
						{ terms.map( ( term ) => (
							<span
								key={ term.slug }
								className="wp-block-query-filter-taxonomy__choice"
							>
								{ term.name }
							</span>
						) ) }
					</div>
				) : (
					<select
						className="wp-block-query-filter-taxonomy__select wp-block-query-filter__select"
						inert
					>
						<option>
							{ emptyLabel ||
								__( 'All', 'query-filter' ) }
						</option>
						{ terms.map( ( term ) => (
							<option key={ term.slug }>
								{ term.name }
							</option>
						) ) }
					</select>
				) }
			</div>
		</>
	);
}
