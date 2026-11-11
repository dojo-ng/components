/**
 * One shared keyboard stack for open overlays (dialogs, slide panes, popups, tooltips).
 *
 * Each overlay used to add its own `document` keydown listener, so one Escape closed every open
 * overlay at once: a select's popup and the dialog around it, or a tooltip and its dialog. Now an
 * overlay registers here while it is open, and a single listener hands Escape to the overlay
 * opened last, and Tab to the last-opened overlay that traps focus. Everything underneath stays
 * open until its own turn.
 */

export interface OverlayEntry {
	/** Called when Escape is pressed and this is the top overlay. */
	onEscape?: (event: KeyboardEvent) => void;
	/** Called on Tab when this is the top overlay that traps focus. */
	onTab?: (event: KeyboardEvent) => void;
}

const stack: OverlayEntry[] = [];
let listening = false;

const onKeyDown = (event: KeyboardEvent): void => {
	if (event.defaultPrevented) return;
	if (event.key === "Escape") {
		for (let i = stack.length - 1; i >= 0; i--) {
			const entry = stack[i];
			if (!entry.onEscape) continue;
			entry.onEscape(event);
			return;
		}
	} else if (event.key === "Tab") {
		for (let i = stack.length - 1; i >= 0; i--) {
			const entry = stack[i];
			if (!entry.onTab) continue;
			entry.onTab(event);
			return;
		}
	}
};

/**
 * Put an overlay on top of the stack. Returns a release function that removes it again; calling
 * the release more than once is safe.
 */
export function pushOverlay(entry: OverlayEntry): () => void {
	stack.push(entry);
	if (!listening && typeof document !== "undefined") {
		document.addEventListener("keydown", onKeyDown);
		listening = true;
	}
	let released = false;
	return () => {
		if (released) return;
		released = true;
		const i = stack.indexOf(entry);
		if (i >= 0) stack.splice(i, 1);
		if (stack.length === 0 && listening) {
			document.removeEventListener("keydown", onKeyDown);
			listening = false;
		}
	};
}

/** Whether `entry` is the overlay that Escape would go to right now. */
export function isTopOverlay(entry: OverlayEntry): boolean {
	for (let i = stack.length - 1; i >= 0; i--) {
		if (stack[i].onEscape) return stack[i] === entry;
	}
	return false;
}

/** Number of overlays currently registered. For tests. */
export function overlayCount(): number {
	return stack.length;
}
