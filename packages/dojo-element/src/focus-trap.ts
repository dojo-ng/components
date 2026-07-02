/** Shared keyboard focus-trap helpers for modal overlays (dialog, slide-pane). */

/** Native focusable elements (custom elements are handled separately, by marker). */
export const NATIVE_FOCUSABLE_SELECTOR =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Kept for backwards compatibility / first-focus lookups. Custom-element focus
 * stops are no longer hand-listed here — the trap discovers them via each
 * component's `static focusable` marker (see `isFocusable`).
 */
export const FOCUSABLE_SELECTOR = NATIVE_FOCUSABLE_SELECTOR;

/** True when a `dj-*` custom element declares itself a focus stop (`static focusable = true`). */
function isMarkedFocusableElement(el: Element): boolean {
	const tag = el.localName;
	if (tag.indexOf("-") === -1) return false;
	const ctor = customElements.get(tag) as (CustomElementConstructor & { focusable?: boolean }) | undefined;
	return ctor?.focusable === true;
}

/** True when `el` is disabled via attribute or property. */
function isDisabled(el: Element): boolean {
	return el.matches("[disabled]") || (el as unknown as { disabled?: boolean }).disabled === true;
}

/** Whether `el` is a keyboard focus stop: a native focusable, or a marked dj- element. */
export function isFocusable(el: Element): boolean {
	if (isDisabled(el)) return false;
	return isMarkedFocusableElement(el) || el.matches(NATIVE_FOCUSABLE_SELECTOR);
}

/** The truly-focused element, walking down through nested shadow roots. */
export function deepActiveElement(): Element | null {
	let a: Element | null = document.activeElement;
	while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
	return a;
}

/** The first focus stop within `root` (in document order), or null. */
export function firstFocusable(root: ParentNode): HTMLElement | null {
	for (const el of root.querySelectorAll<HTMLElement>("*")) {
		if (isFocusable(el)) return el;
	}
	return null;
}

/** Ordered focusables for an overlay: its own shadow controls first, then slotted light-DOM content. */
export function collectFocusables(shadowRoot: ShadowRoot, host: HTMLElement): HTMLElement[] {
	const list: HTMLElement[] = [];
	const add = (root: ParentNode) =>
		root.querySelectorAll<HTMLElement>("*").forEach((el) => {
			if (isFocusable(el)) list.push(el);
		});
	add(shadowRoot);
	add(host);
	return list;
}

/** True once focus (across shadow roots) lands on or inside `el`. */
function focusLandedOn(el: HTMLElement): boolean {
	const active = deepActiveElement();
	return el === active || el.contains(active) || (el.shadowRoot != null && el.shadowRoot.contains(active));
}

/**
 * On Tab/Shift+Tab, keep focus within `focusables`: wrap at the ends and recapture stray focus.
 * With no focusables, does nothing — Tab moves focus normally rather than trapping it nowhere.
 * A wrap/recapture only preventDefaults if `focus()` actually moved focus, so a control whose
 * host doesn't forward focus can never become a dead stop.
 */
export function trapTabKey(event: KeyboardEvent, focusables: HTMLElement[]): void {
	if (focusables.length === 0) return;
	const active = deepActiveElement();
	const idx = focusables.findIndex((el) => el === active || (el.shadowRoot != null && el.shadowRoot.contains(active)));
	const moveTo = (el: HTMLElement) => {
		el.focus();
		if (focusLandedOn(el)) event.preventDefault();
	};
	if (idx === -1) { moveTo(focusables[0]); return; }
	if (event.shiftKey && idx === 0) moveTo(focusables[focusables.length - 1]);
	else if (!event.shiftKey && idx === focusables.length - 1) moveTo(focusables[0]);
}

/**
 * True when the currently focused element (across nested shadow roots) is `host` or composed
 * inside it — including content slotted from `host` into a child. Climbs the composed tree
 * via parentNode, hopping out of each shadow root through its `host`.
 */
export function isFocusWithin(host: Element): boolean {
	let node: Node | null = deepActiveElement();
	while (node) {
		if (node === host) return true;
		const parent: Node | null = node.parentNode;
		node = parent instanceof ShadowRoot ? parent.host : parent;
	}
	return false;
}

/**
 * Light-dismiss a popup-style overlay when keyboard or programmatic focus leaves `host`
 * (e.g. tabbing past the field). Outside *clicks* are handled by the popup underlay; this
 * covers the focus-out case that clicks don't. The 0 ms timer lets `document.activeElement`
 * settle on the newly focused element before we test containment, and we skip the close when
 * focus merely moved into the popup list inside `host`. Returns a disposer.
 */
export function dismissOnFocusOut(host: HTMLElement, onLeave: () => void): () => void {
	const handler = () => { setTimeout(() => { if (!isFocusWithin(host)) onLeave(); }, 0); };
	host.addEventListener("focusout", handler);
	return () => host.removeEventListener("focusout", handler);
}
