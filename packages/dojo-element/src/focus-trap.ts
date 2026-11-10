/** Shared keyboard focus-trap helpers for modal overlays (dialog, slide-pane). */

/** Native focusable elements (custom elements are handled separately, by marker). */
export const NATIVE_FOCUSABLE_SELECTOR =
	'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,audio[controls],video[controls],details>summary:first-of-type,[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"])';

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

/** True when a negative `tabindex` takes `el` out of the Tab order (it can still take focus from code). */
function hasNegativeTabIndex(el: Element): boolean {
	const attr = el.getAttribute("tabindex");
	return attr != null && attr.trim() !== "" && Number(attr) < 0;
}

/** The parent in the flat tree: the slot a node is assigned to, else its parent, else its shadow host. */
function flatParent(el: Element): Element | null {
	if (el.assignedSlot) return el.assignedSlot;
	if (el.parentElement) return el.parentElement;
	const root = el.parentNode;
	return root instanceof ShadowRoot ? root.host : null;
}

/**
 * True when `el` cannot take focus because it, or anything above it in the flat tree, is
 * `inert` or not rendered (`hidden`, `display: none`, or `visibility: hidden`).
 */
function isHiddenOrInert(el: Element): boolean {
	for (let n: Element | null = el; n; n = flatParent(n)) {
		if (n.hasAttribute("inert")) return true;
	}
	// A `display: contents` element has no box of its own, so judge it by its parent.
	let box: Element | null = el;
	while (box && getComputedStyle(box).display === "contents") box = flatParent(box);
	if (!box) return true;
	if (typeof box.checkVisibility === "function") return !box.checkVisibility({ visibilityProperty: true });
	// Engines without checkVisibility (Safari before 17.4): walk the flat tree for display: none.
	for (let n: Element | null = box; n; n = flatParent(n)) {
		if (getComputedStyle(n).display === "none") return true;
	}
	return getComputedStyle(box).visibility === "hidden";
}

/**
 * Whether `el` is a keyboard focus stop: a native focusable, or a marked dj- element, that is
 * not disabled, not taken out of the Tab order by a negative `tabindex`, and not hidden or inert.
 */
export function isFocusable(el: Element): boolean {
	if (isDisabled(el) || hasNegativeTabIndex(el)) return false;
	if (!isMarkedFocusableElement(el) && !el.matches(NATIVE_FOCUSABLE_SELECTOR)) return false;
	return !isHiddenOrInert(el);
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

/**
 * Ordered focusables for an overlay, in COMPOSED order: the shadow tree is walked in tree
 * order and every `<slot>` is replaced by what is actually assigned to it (flattened through
 * nested slots, so content redistributed from an outer component's own slot is found too),
 * or by its fallback content when nothing is. That is the order the user Tabs through, which
 * is what a trap has to match at the wrap points. Nested shadow roots are not pierced — a
 * `dj-*` control inside is a single stop by its `static focusable` marker.
 *
 * Reaching through slots is the point: an overlay's light-DOM children are often only a
 * wrapper around ANOTHER component's `<slot>` (dj-nav puts `<nav><slot></slot></nav>` inside
 * dj-slide-pane, and the real links are dj-nav's light DOM), and the literal `host` subtree
 * never contains those. A shadow tree with no slot at all falls back to the host's light DOM,
 * as before.
 */
export function collectFocusables(shadowRoot: ShadowRoot, host: HTMLElement): HTMLElement[] {
	const list: HTMLElement[] = [];
	let sawSlot = false;
	const visit = (el: Element) => {
		if (el instanceof HTMLSlotElement) {
			sawSlot = true;
			const assigned = el.assignedElements({ flatten: true });
			if (assigned.length) assigned.forEach(visit);
			else walk(el);
			return;
		}
		if (isFocusable(el)) list.push(el as HTMLElement);
		walk(el);
	};
	const walk = (node: ParentNode) => {
		for (const child of node.children) visit(child);
	};
	walk(shadowRoot);
	if (!sawSlot) {
		host.querySelectorAll<HTMLElement>("*").forEach((el) => {
			if (isFocusable(el)) list.push(el);
		});
	}
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
	// Try each candidate in turn, so a stop that refuses focus is skipped instead of letting
	// focus escape the overlay.
	const moveTo = (candidates: HTMLElement[]) => {
		for (const el of candidates) {
			el.focus();
			if (focusLandedOn(el)) { event.preventDefault(); return; }
		}
	};
	const forward = focusables;
	const backward = [...focusables].reverse();
	if (idx === -1) moveTo(forward);
	else if (event.shiftKey && idx === 0) moveTo(backward);
	else if (!event.shiftKey && idx === focusables.length - 1) moveTo(forward);
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
