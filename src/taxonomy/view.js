import { store, getElement, getContext } from '@wordpress/interactivity';

/**
 * Partial page refresh for third-party query blocks.
 *
 * Fetches the target URL server-side, extracts the updated query block
 * HTML from the response, and swaps it into the current DOM without a
 * full page reload. Used for blocks that are NOT Interactivity-API-aware
 * (GreenShift, Blocksy, etc.).
 *
 * @param {string} url           The URL to fetch (includes filter params).
 * @param {string} targetBlockId The data-qf-block-id value on the query container.
 */
async function partialRefresh( url, targetBlockId ) {
	const selector = `[data-qf-block-id="${ CSS.escape(
		targetBlockId
	) }"]`;
	const currentBlock = document.querySelector( selector );

	if ( ! currentBlock ) {
		window.location.href = url;
		return;
	}

	// Visual loading indicator.
	currentBlock.style.opacity = '0.5';
	currentBlock.style.transition = 'opacity 0.2s';

	// Snapshot focused element and cursor position before any async work.
	// The DOM swap and history.pushState (which the WP Interactivity Router
	// may intercept) can steal focus from an active search input.
	const focusedEl = document.activeElement;
	const selStart =
		focusedEl instanceof HTMLInputElement ||
		focusedEl instanceof HTMLTextAreaElement
			? focusedEl.selectionStart
			: null;
	const selEnd =
		focusedEl instanceof HTMLInputElement ||
		focusedEl instanceof HTMLTextAreaElement
			? focusedEl.selectionEnd
			: null;

	try {
		const response = await fetch( url );
		const html = await response.text();
		const doc = new DOMParser().parseFromString( html, 'text/html' );
		const newBlock = doc.querySelector( selector );

		if ( newBlock ) {
			currentBlock.innerHTML = newBlock.innerHTML;
			currentBlock.style.opacity = '';
			window.history.pushState( null, '', url );

			// Restore focus and cursor if stolen by the DOM swap or pushState.
			if (
				focusedEl &&
				document.contains( focusedEl ) &&
				document.activeElement !== focusedEl
			) {
				focusedEl.focus();
				if ( selStart !== null ) {
					focusedEl.setSelectionRange( selStart, selEnd );
				}
			}
		} else {
			window.location.href = url;
		}
	} catch {
		window.location.href = url;
	}
}

const updateURL = async ( action, value, name ) => {
	const url = new URL( action );
	if ( value || name === 's' ) {
		url.searchParams.set( name, value );
	} else {
		url.searchParams.delete( name );
	}
	const { actions } = await import( '@wordpress/interactivity-router' );
	await actions.navigate( url.toString() );
};

const { state } = store( 'query-filter', {
	actions: {
		/**
		 * Taxonomy filter handler — works for both <select> changes
		 * and <a> button clicks.
		 *
		 * For core/query: uses the Interactivity Router (client-side).
		 * For third-party: does a partial AJAX refresh of the query block.
		 */
		*navigate( e ) {
			e.preventDefault();

			// Support both select (e.target.value) and anchor (href) elements.
			const el = e.target;
			const url =
				el.value ||
				el.getAttribute( 'href' ) ||
				el.closest( 'a' )?.getAttribute( 'href' );
			if ( ! url ) return;

			const ctx = getContext();

			if ( ctx.targetBlockId && ! ctx.isCore ) {
				yield partialRefresh( url, ctx.targetBlockId );
			} else {
				const { actions } = yield import(
					'@wordpress/interactivity-router'
				);
				yield actions.navigate( url );
			}
		},

		/**
		 * Legacy search handler for core/search blocks inside core/query.
		 */
		*search( e ) {
			e.preventDefault();
			const { ref } = getElement();
			let action, name, value;
			if ( ref.tagName === 'FORM' ) {
				const input = ref.querySelector( 'input[type="search"]' );
				action = ref.action;
				name = input.name;
				value = input.value;
			} else {
				action = ref.closest( 'form' ).action;
				name = ref.name;
				value = ref.value;
			}

			// Don't navigate if the search didn't really change.
			if ( value === state.searchValue ) return;

			state.searchValue = value;

			yield updateURL( action, value, name );
		},
	},
} );
