/**
 * Block Connection inspector panel.
 *
 * Allows the user to scan the current post for query-type blocks
 * and connect the Taxonomy Filter to one of them.
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	Button,
	Notice,
} from '@wordpress/components';
import { useState, useMemo } from '@wordpress/element';
import { findQueryBlocks } from '../query-adapters';

export default function BlockConnection( {
	attributes,
	setAttributes,
	context,
} ) {
	const { targetBlockId } = attributes;
	const [ selectedCandidate, setSelectedCandidate ] = useState( '' );

	const hasQueryContext =
		context?.queryId !== undefined || !! context?.query;

	// Detect if a parent Filter Group provides the connection.
	const containerTargetBlockId =
		context?.[ 'query-filter/targetBlockId' ] || '';
	const hasContainerConnection =
		! targetBlockId && !! containerTargetBlockId;

	const allBlocks = useSelect( ( select ) => {
		return select( blockEditorStore ).getBlocks();
	}, [] );

	const candidates = useMemo( () => {
		return findQueryBlocks( allBlocks );
	}, [ allBlocks ] );

	const connectedCandidate = useMemo( () => {
		if ( ! targetBlockId ) {
			return null;
		}
		return (
			candidates.find(
				( c ) =>
					c.stableId === targetBlockId ||
					c.clientId === targetBlockId
			) || null
		);
	}, [ targetBlockId, candidates ] );

	const handleConnect = () => {
		const candidate = candidates.find(
			( c ) =>
				( c.stableId || c.clientId ) === selectedCandidate
		);
		if ( ! candidate ) {
			return;
		}

		const stableId = candidate.stableId || candidate.clientId;
		setAttributes( {
			targetBlockId: stableId,
			targetBlockType: candidate.block.name,
		} );
		setSelectedCandidate( '' );
	};

	const handleDisconnect = () => {
		setAttributes( {
			targetBlockId: '',
			targetBlockType: '',
		} );
	};

	// If inside a Filter Group container that provides the connection, show inherited state.
	if ( hasContainerConnection ) {
		return (
			<PanelBody
				title={ __( 'Block Connection', 'query-filter' ) }
				initialOpen={ false }
			>
				<p>
					<strong>
						{ __( 'Inherited from Filter Group', 'query-filter' ) }
					</strong>
				</p>
				<p className="components-base-control__help">
					{ __(
						'This filter inherits its query connection from the parent Filter Group. To override, connect to a specific block below.',
						'query-filter'
					) }
				</p>
				{ candidates.length > 0 && (
					<>
						<SelectControl
							label={ __(
								'Override connection',
								'query-filter'
							) }
							value={ selectedCandidate }
							options={ [
								{
									label: __(
										'— Use Filter Group —',
										'query-filter'
									),
									value: '',
								},
								...candidates.map( ( c ) => ( {
									label:
										c.label +
										( c.stableId
											? ''
											: ` [${ __(
													'unstable ID',
													'query-filter'
											  ) }]` ),
									value: c.stableId || c.clientId,
								} ) ),
							] }
							onChange={ setSelectedCandidate }
						/>
						<Button
							variant="secondary"
							disabled={ ! selectedCandidate }
							onClick={ handleConnect }
						>
							{ __(
								'Override with selected block',
								'query-filter'
							) }
						</Button>
					</>
				) }
			</PanelBody>
		);
	}

	// If inside a core/query and no explicit targetBlockId, show auto-connected state
	if ( hasQueryContext && ! targetBlockId ) {
		return (
			<PanelBody
				title={ __( 'Block Connection', 'query-filter' ) }
				initialOpen={ false }
			>
				<p>
					<strong>
						{ __( 'Auto-connected', 'query-filter' ) }
					</strong>
					{ ': ' }
					{ __(
						'Using parent Query Loop block context.',
						'query-filter'
					) }
				</p>
				<p className="components-base-control__help">
					{ __(
						'You can optionally connect to a different query block.',
						'query-filter'
					) }
				</p>
				{ candidates.length > 0 && (
					<>
						<SelectControl
							label={ __(
								'Connect to a different block',
								'query-filter'
							) }
							value={ selectedCandidate }
							options={ [
								{
									label: __(
										'— Select a block —',
										'query-filter'
									),
									value: '',
								},
								...candidates.map( ( c ) => ( {
									label:
										c.label +
										( c.stableId
											? ''
											: ` [${ __(
													'unstable ID',
													'query-filter'
											  ) }]` ),
									value: c.stableId || c.clientId,
								} ) ),
							] }
							onChange={ setSelectedCandidate }
						/>
						<Button
							variant="secondary"
							disabled={ ! selectedCandidate }
							onClick={ handleConnect }
						>
							{ __(
								'Connect to selected block',
								'query-filter'
							) }
						</Button>
					</>
				) }
			</PanelBody>
		);
	}

	return (
		<PanelBody
			title={ __( 'Block Connection', 'query-filter' ) }
			initialOpen={ true }
		>
			{ connectedCandidate ? (
				<>
					<p>
						<strong>
							{ __( 'Connected to:', 'query-filter' ) }
						</strong>{ ' ' }
						{ connectedCandidate.label }
					</p>
					{ ! connectedCandidate.stableId && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'This connection uses a temporary ID (clientId). It may break if the page is duplicated. Set an HTML anchor on the target block for a stable connection.',
								'query-filter'
							) }
						</Notice>
					) }
					<Button
						variant="secondary"
						isDestructive
						onClick={ handleDisconnect }
						style={ { marginTop: '8px' } }
					>
						{ __( 'Disconnect', 'query-filter' ) }
					</Button>
				</>
			) : (
				<>
					{ targetBlockId && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'The connected block could not be found. It may have been removed. Please reconnect or switch to manual mode.',
								'query-filter'
							) }
						</Notice>
					) }
					{ candidates.length > 0 ? (
						<>
							<SelectControl
								label={ __(
									'Select a query block to connect',
									'query-filter'
								) }
								value={ selectedCandidate }
								options={ [
									{
										label: __(
											'— Select a block —',
											'query-filter'
										),
										value: '',
									},
									...candidates.map( ( c ) => ( {
										label:
											c.label +
											( c.stableId
												? ''
												: ` [${ __(
														'unstable ID',
														'query-filter'
												  ) }]` ),
										value: c.stableId || c.clientId,
									} ) ),
								] }
								onChange={ setSelectedCandidate }
							/>
							<Button
								variant="primary"
								disabled={ ! selectedCandidate }
								onClick={ handleConnect }
								style={ { marginTop: '8px' } }
							>
								{ __(
									'Connect to selected block',
									'query-filter'
								) }
							</Button>
						</>
					) : (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'No query blocks found on this page. Use manual mode to configure the taxonomy filter.',
								'query-filter'
							) }
						</Notice>
					) }
				</>
			) }
		</PanelBody>
	);
}
