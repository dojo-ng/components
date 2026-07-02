/**
 * A shared, reference-counted body scroll lock for overlays (popup, dialog,
 * slide-pane). Several overlays can hold the lock at once; the body stays
 * locked until the LAST holder releases. The page's original inline
 * `overflow` is captured on the first lock and restored on the last release,
 * so a pre-existing inline style is never clobbered.
 *
 * `lockBodyScroll()` returns a release function. Release is idempotent —
 * calling it more than once counts only once — so a component can safely
 * release on both close and disconnect without under-counting.
 */
let count = 0;
let savedOverflow = "";

export function lockBodyScroll(): () => void {
	if (count === 0) {
		savedOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
	}
	count++;

	let released = false;
	return () => {
		if (released) return;
		released = true;
		count--;
		if (count === 0) {
			document.body.style.overflow = savedOverflow;
		}
	};
}
