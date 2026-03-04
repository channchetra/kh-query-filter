import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

import BlockConnection from '../taxonomy/components/block-connection';

export default function Edit( { attributes, setAttributes, context } ) {
	const { placeholder, label, showLabel, targetBlockId } = attributes;

	const hasQueryContext =
		context?.queryId !== undefined || !! context?.query;
	const hasContainerConnection =
		! targetBlockId && !! context?.[ 'query-filter/targetBlockId' ];
	const isConnected =
		!! targetBlockId || hasQueryContext || hasContainerConnection;

	return (
		<>
			<InspectorControls>
				<BlockConnection
					attributes={ attributes }
					setAttributes={ setAttributes }
					context={ context }
				/>
				<PanelBody title={ __( 'Search Settings', 'query-filter' ) }>
					<TextControl
						label={ __( 'Label', 'query-filter' ) }
						value={ label }
						help={ __(
							'Visible label above the search input.',
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
						label={ __( 'Placeholder', 'query-filter' ) }
						value={ placeholder }
						onChange={ ( newPlaceholder ) =>
							setAttributes( {
								placeholder: newPlaceholder,
							} )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div
				{ ...useBlockProps( {
					className:
						'wp-block-query-filter wp-block-query-filter-search',
				} ) }
			>
				{ ! isConnected && (
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
							'Not connected to a query block. Connect a block in the sidebar.',
							'query-filter'
						) }
					</div>
				) }
				{ showLabel && (
					<label className="wp-block-query-filter-search__label wp-block-query-filter__label">
						{ label || __( 'Search', 'query-filter' ) }
					</label>
				) }
				<input
					type="search"
					className="wp-block-query-filter-search__input wp-block-query-filter__input"
					placeholder={
						placeholder || __( 'Search…', 'query-filter' )
					}
					disabled
				/>
			</div>
		</>
	);
}
