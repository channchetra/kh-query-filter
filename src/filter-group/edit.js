import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

import BlockConnection from '../taxonomy/components/block-connection';

const ALLOWED_BLOCKS = [ 'query-filter/taxonomy', 'query-filter/search' ];
const TEMPLATE = [ [ 'query-filter/taxonomy', {} ] ];

export default function Edit( { attributes, setAttributes, context } ) {
	const { targetBlockId } = attributes;

	const hasQueryContext =
		context?.queryId !== undefined || !! context?.query;
	const isConnected = !! targetBlockId || hasQueryContext;

	const blockProps = useBlockProps( {
		className: 'wp-block-query-filter-group',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			templateLock: false,
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);

	return (
		<>
			<InspectorControls>
				<BlockConnection
					attributes={ attributes }
					setAttributes={ setAttributes }
					context={ context }
				/>
				<PanelBody
					title={ __( 'About', 'query-filter' ) }
					initialOpen={ false }
				>
					<p className="components-base-control__help">
						{ __(
							'This container manages the query connection for all filter blocks inside it. Add Taxonomy Filter and Search Filter blocks as children — their queries are combined automatically.',
							'query-filter'
						) }
					</p>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ ! isConnected && (
					<div
						className="wp-block-query-filter-group__warning"
						style={ {
							padding: '8px 12px',
							backgroundColor: '#fcf0e3',
							borderLeft: '4px solid #dba617',
							marginBottom: '8px',
							fontSize: '13px',
							width: '100%',
						} }
					>
						{ __(
							'Not connected to a query block. Use the sidebar to connect this Filter Group to a query block.',
							'query-filter'
						) }
					</div>
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
