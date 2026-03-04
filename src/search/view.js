/**
 * Search Filter frontend interactivity.
 *
 * Debounced search for all block types:
 * - Core/query: Uses the Interactivity API Router (client-side).
 * - Third-party (GreenShift, Blocksy): Partial AJAX refresh — fetches
 *   the new page, extracts the updated query block HTML, and swaps it
 *   into the current DOM.
 */
import { store, getContext } from '@wordpress/interactivity';

let searchTimer = null;

/**
 * Partial page refresh for third-party query blocks.
 *
 * @param {string} url           The URL to fetch (includes search param).
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

/**
 * Build a search URL from a form and input element.
 *
 * @param {HTMLFormElement}  form  The form element.
 * @param {HTMLInputElement} input The search input.
 * @return {string} The full URL string.
 */
function buildSearchUrl( form, input ) {
	const url = new URL( form.action, window.location.origin );
	if ( input.value ) {
		url.searchParams.set( input.name, input.value );
	} else {
		url.searchParams.delete( input.name );
	}
	return url.toString();
}

const { state } = store( 'query-filter', {
	actions: {
		/**
		 * Debounced search handler for both core and third-party blocks.
		 *
		 * Fires on input (while typing) and on form submit (Enter key).
		 * Waits 400 ms after the last keystroke before triggering navigation.
		 */
		qfSearch( e ) {
			e.preventDefault();
			const input =
				e.target.tagName === 'INPUT'
					? e.target
					: e.target.querySelector( 'input[type="search"]' );

			if ( ! input ) return;

			const form = input.closest( 'form' );
			const value = input.value;

			if ( value === state.searchValue ) return;
			state.searchValue = value;

			const url = buildSearchUrl( form, input );
			const ctx = getContext();

			if ( searchTimer ) clearTimeout( searchTimer );
			searchTimer = setTimeout( async () => {
				if ( ctx.targetBlockId && ! ctx.isCore ) {
					await partialRefresh( url, ctx.targetBlockId );
				} else {
					const { actions } = await import(
						'@wordpress/interactivity-router'
					);
					await actions.navigate( url );
				}
			}, 400 );
		},
	},
} );
