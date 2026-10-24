import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, {
	TokenFlagController,
	reducedMotion,
	firstFocusable,
	isFocusWithin,
	collectFocusables,
	trapTabKey,
	dismissOnFocusOut,
	lockBodyScroll,
} from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { getHistory, whenHistory, type HistoryInstance, type NavigateDetail } from "@dojo-ng/history/handle";
import "@dojo-ng/slide-pane";
import styles from "./dj-nav.styles.js";

registerDefaults("dj", {
	navigation: "Navigation",
	menu: "Menu",
});
const EN: Record<string, string> = {
	navigation: "Navigation",
	menu: "Menu",
};

/**
 * `<dj-nav>` — a navigation landmark that collapses into a button and a panel when there is not
 * enough room.
 *
 * This is the "hamburger menu" or "navicon" pattern. A menu button that stays collapsed on a wide
 * desktop screen is a normal use too, not only a mobile layout. Put the links in the default slot
 * as plain `<a>` elements.
 *
 * #### When it collapses
 * - By default the nav collapses when its container is narrower than 45rem.
 * - To change that, set the `--dj-nav-collapsed` custom property on the element: 1 collapses, 0
 *   expands. Because it is a theme token, not a breakpoint property, it can depend on the
 *   container: a nav in a narrow sidebar collapses even on a wide screen.
 * - The component checks again when its own size changes. After a change that does not resize it,
 *   such as a theme switch or a media query on the viewport, call `refresh()`.
 * - Only one arrangement is in the DOM at a time: the plain `<nav>` when expanded, or the button
 *   (and, while open, a panel around the same `<nav>`) when collapsed.
 *
 * #### The panel
 * - `panel="drawer"` (the default) uses `<dj-slide-pane>`, which opens from the side of the reading
 *   direction.
 * - `panel="dropdown"` and `panel="overlay"` are drawn inside the component itself.
 * - `dj-nav-toggle` fires when the panel opens or closes, and `dj-nav-collapse` when the
 *   arrangement changes.
 *
 * #### Accessibility
 * - This is a disclosure, not a menu (in APG terms): the links stay plain links in a `<nav>`, and
 *   the button has no `aria-haspopup`.
 *
 * #### Tracking the app's navigation
 * - Set `track` and the links follow `@dojo-ng/history`, with no click handler to write. A plain left
 *   click on a link to a page of the same app (`target` absent or `_self`, no `download`, same origin,
 *   under the history `base`) dispatches `dj-navigate` and is not followed by the browser. Ctrl-, Cmd-
 *   and middle-click keep the browser's link behavior.
 * - The link whose path is the current location gets `aria-current="page"`, and the others lose it.
 *   The match is exact, so a link to `/orders` is not current at `/orders/7`. `dj-nav` owns
 *   `aria-current` on its links while `track` is on, and clears it when `track` goes off.
 * - In the collapsed arrangement the panel closes after a tracked click and focus goes to the trigger.
 * - It needs `@dojo-ng/history` installed. Without it, `track` does nothing and nothing throws.
 *
 * #### Not built
 * - Toolbar-style overflow, which shows what fits and moves the rest into a menu. That is a
 *   separate component.
 *
 * Slots: default (the links — plain `<a>` elements), `trigger` (optional, replaces the built-in
 * three-bar mark).
 * Parts: `trigger`, `panel`, `nav`.
 * Events:
 *  - `dj-nav-toggle` (detail `{ open }`) — the panel opened or closed, from any cause.
 *  - `dj-nav-collapse` (detail `{ collapsed }`) — the arrangement flipped.
 *  - `dj-navigate` (detail `{ path, label }`) — a tracked link was clicked. `@dojo-ng/history` turns it into a navigation.
 *
 */
export class DjNav extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.1";

	/** Accessible name for the `<nav>` landmark. */
	@property() label?: string;

	/** Whether the panel is showing. Only meaningful while collapsed. */
	@property({ type: Boolean, reflect: true }) open = false;

	/** `"drawer"` | `"dropdown"` | `"overlay"`. Presentation only; independent of the collapse
	 * policy. */
	@property({ reflect: true }) panel: "drawer" | "dropdown" | "overlay" = "drawer";

	/** Accessible name for the trigger button. */
	@property({ attribute: "trigger-label" }) triggerLabel?: string;

	/** Whether the nav is currently collapsed (trigger + panel) or inline. Managed by the
	 * component; consumers treat it as read-only. Reflected so page CSS can style either
	 * arrangement. */
	@property({ type: Boolean, reflect: true }) collapsed = false;

	/** Follow `@dojo-ng/history`: turn plain clicks on the links into navigations and mark the current one. Needs history installed. */
	@property({ type: Boolean }) track = false;

	#i18n = new LocaleController(this);
	#unsubscribe?: () => void;
	#path?: string;
	/** Links this component has marked, so turning `track` off clears exactly those. */
	#marked = new Set<Element>();
	#collapse = new TokenFlagController(this, "--dj-nav-collapsed");
	#releaseScroll?: () => void;
	#dismissDropdown?: () => void;
	/** Set in `willUpdate` on a collapse flip that happened while focus was inside this
	 * component; consumed in `updated`, once the new arrangement's DOM exists. */
	#pendingFlipFocus: "trigger" | "link" | null = null;

	#msg(key: string): string {
		return messages.resolve("dj", this.#i18n.locale, key) ?? EN[key] ?? key;
	}

	protected override willUpdate() {
		const next = this.#collapse.value;
		if (next === this.collapsed) return;
		// Check BEFORE mutating anything: once the old arrangement is torn down, focus has
		// already moved (a browser blurs a removed focused element), so this is the only
		// point where "was focus inside" is still answerable.
		const focusWasInside = isFocusWithin(this);
		this.collapsed = next;
		this.#close(); // no-op if already closed; emits dj-nav-toggle if it wasn't (see its own doc: "from any cause").
		this.emit("dj-nav-collapse", { detail: { collapsed: next } });
		if (focusWasInside) this.#pendingFlipFocus = next ? "trigger" : "link";
	}

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("track")) {
			if (this.track) this.#follow();
			else this.#stop();
		}
		if (this.#pendingFlipFocus !== null) {
			const which = this.#pendingFlipFocus;
			this.#pendingFlipFocus = null;
			const target =
				which === "trigger"
					? this.renderRoot.querySelector<HTMLElement>(".trigger")
					: firstFocusable(this);
			target?.focus();
		}

		if (!changed.has("open") && !changed.has("panel")) return;

		if (this.open && (this.panel === "overlay" || this.panel === "drawer")) {
			if (!this.#releaseScroll) this.#releaseScroll = lockBodyScroll();
		} else {
			this.#releaseScroll?.();
			this.#releaseScroll = undefined;
		}

		if (this.open && this.panel === "dropdown") {
			this.#dismissDropdown ??= dismissOnFocusOut(this, () => this.hide());
		} else {
			this.#dismissDropdown?.();
			this.#dismissDropdown = undefined;
		}
	}

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener("keydown", this.#onDocumentKeydown);
		this.addEventListener("click", this.#onLinkClick);
		this.#follow();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this.#onDocumentKeydown);
		this.removeEventListener("click", this.#onLinkClick);
		this.#stop();
		this.#releaseScroll?.();
		this.#releaseScroll = undefined;
		this.#dismissDropdown?.();
		this.#dismissDropdown = undefined;
	}

	async show() {
		if (this.open) return;
		this.open = true;
		this.emit("dj-nav-toggle", { detail: { open: true } });
		await this.updateComplete;
		// Scoped to `this`, not the panel wrapper: the actual links are light-DOM children of
		// the host regardless of presentation — the panel markup around them is only ever a
		// projection target (`<slot>`), never their real DOM parent, so searching the wrapper
		// itself would never find them.
		firstFocusable(this)?.focus();
	}

	hide() {
		// Checked before closing, against `this`: every presentation's focusable content is a
		// light-DOM child of the host, so that is the one scope it's actually reachable from.
		const shouldReturnFocus = this.open && isFocusWithin(this);
		if (this.#close() && shouldReturnFocus) {
			this.renderRoot.querySelector<HTMLElement>(".trigger")?.focus();
		}
	}

	/** State + event half of closing, with no focus side effect — `hide()` adds the
	 * "return focus to the trigger" behavior; a collapse flip wants its own relocation rule
	 * instead (see `willUpdate`), since the trigger it would otherwise focus may be mid-removal
	 * or not exist yet in the new arrangement. */
	#close(): boolean {
		if (!this.open) return false;
		this.open = false;
		this.emit("dj-nav-toggle", { detail: { open: false } });
		return true;
	}

	toggle() {
		if (this.open) this.hide();
		else this.show();
	}

	/** Delegates to `TokenFlagController` — the escape hatch for a runtime pin or theme switch
	 * that `ResizeObserver` cannot see (it only sees size changes). */
	refresh() {
		this.#collapse.refresh();
	}

	/** Document-level, not shadow-tree-scoped — the same shape `dj-slide-pane`, `dj-dialog`, and
	 * `dj-popup` already use for their own Escape handling, and for the same reason: a listener
	 * that only fires while the event bubbles up FROM wherever focus happens to be depends on
	 * focus actually still being somewhere inside this component when Escape is pressed. Drawer
	 * already gets this for free (`dj-slide-pane`'s own document listener, mirrored into `hide()`
	 * via the `dj-close` handler in `#renderPanel`); dropdown and overlay had no such handler of
	 * their own until this one, relying on `#onTabKeydown` below, which — being shadow-scoped —
	 * cannot close the panel once focus has ended up outside this component's tree by any route
	 * other than a Tab this component itself trapped. Calling `hide()` twice in the same tick
	 * (this listener and, for drawer, slide-pane's own) is harmless: `#close()` no-ops once
	 * `open` is already false. */
	#onDocumentKeydown = (event: KeyboardEvent) => {
		if (!this.open) return;
		if (event.key === "Escape") {
			event.stopPropagation();
			this.hide();
		}
	};

	/** Bound on the wrapper around BOTH the trigger and the panel, not on the panel alone: the
	 * trigger is the overlay trap's own first stop (see the ordering note on
	 * `collectFocusables`), so a Shift+Tab pressed while it is focused needs to reach this
	 * handler too — scoping it to the panel only misses that boundary case entirely, since
	 * the trigger sits outside it.
	 *
	 * Tab is trapped here for overlay only. Drawer is `dj-slide-pane`'s trap, not a second one:
	 * `collectFocusables` walks slots in composed order, so slide-pane reaches the real links
	 * through `<nav><slot></slot></nav>`, and its own close button is inside that trap, which a
	 * trap owned here could not include without piercing its shadow root. Two traps over one
	 * panel fight at the wrap points. Dropdown is never trapped — a non-modal disclosure where
	 * trapping would be an a11y defect. */
	#onTabKeydown = (event: KeyboardEvent) => {
		if (!this.open) return;
		if (event.key === "Tab" && this.panel === "overlay") {
			trapTabKey(event, collectFocusables(this.shadowRoot as ShadowRoot, this));
		}
	};

	/** Follow the location if tracking and history is (or later becomes) installed. */
	#follow() {
		if (!this.isConnected || !this.track || this.#unsubscribe) return;
		const instance = getHistory();
		if (instance) {
			this.#unsubscribe = instance.subscribe((location) => {
				this.#path = location.path;
				this.#markCurrent();
			});
		} else {
			// A WeakRef, so a nav removed before history is installed (it may never be) is not kept alive.
			const self = new WeakRef(this);
			void whenHistory().then(() => { const nav = self.deref(); if (nav) nav.#follow(); });
		}
	}

	#stop() {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		this.#path = undefined;
		for (const link of this.#marked) link.removeAttribute("aria-current");
		this.#marked.clear();
	}

	/** `aria-current="page"` on the link whose app path is the current location, and off the rest. */
	#markCurrent() {
		const instance = getHistory();
		if (!this.track || !instance || this.#path === undefined) return;
		for (const link of this.querySelectorAll("a")) {
			if (appPath(link, instance) === this.#path) {
				link.setAttribute("aria-current", "page");
				this.#marked.add(link);
			} else if (this.#marked.delete(link)) {
				link.removeAttribute("aria-current");
			}
		}
	}

	#onLinkClick = (event: MouseEvent) => {
		const instance = getHistory();
		if (!this.track || !instance) return;
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = (event.target as Element | null)?.closest?.("a");
		if (!link || !this.contains(link) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
		const path = appPath(link, instance);
		if (path === undefined) return;
		event.preventDefault();
		const detail: NavigateDetail = { path, label: link.textContent?.trim() || undefined };
		this.emit("dj-navigate", { detail });
		if (this.collapsed && this.open) {
			this.#close();
			this.renderRoot.querySelector<HTMLElement>(".trigger")?.focus();
		}
	};

	#renderNav() {
		return html`
			<nav part="nav" class="nav" aria-label=${this.label ?? this.#msg("navigation")}>
				<slot @slotchange=${() => this.#markCurrent()}></slot>
			</nav>
		`;
	}

	#renderTrigger() {
		return html`
			<button
				type="button"
				part="trigger"
				class="trigger"
				aria-expanded=${this.open ? "true" : "false"}
				aria-controls="panel"
				aria-label=${this.triggerLabel ?? this.#msg("menu")}
				@click=${() => this.toggle()}
			>
				<slot name="trigger">
					<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
						<rect x="4" y="6" width="16" height="2"></rect>
						<rect x="4" y="11" width="16" height="2"></rect>
						<rect x="4" y="16" width="16" height="2"></rect>
					</svg>
				</slot>
			</button>
		`;
	}

	#renderPanel() {
		if (this.panel === "drawer") {
			const align = this.#i18n.dir === "rtl" ? "right" : "left";
			return html`
				<dj-slide-pane id="panel" part="panel" align=${align} .open=${this.open} @dj-close=${() => this.hide()}>
					${this.#renderNav()}
				</dj-slide-pane>
			`;
		}
		return html`
			<div id="panel" part="panel" class="panel panel--${this.panel}">${this.#renderNav()}</div>
		`;
	}

	override render() {
		if (!this.collapsed) return this.#renderNav();
		return html`
			<div class="collapsed" @keydown=${this.#onTabKeydown}>
				${this.#renderTrigger()}
				${this.open ? this.#renderPanel() : nothing}
			</div>
		`;
	}
}
export default DjNav;

/**
 * The app path a link points to, or `undefined` when it is not a page of this app: another origin, or
 * outside the history `base`. In hash mode (`href("")` is `#`) the route is in the link's hash.
 */
function appPath(link: HTMLAnchorElement, history: HistoryInstance): string | undefined {
	let url: URL;
	try {
		url = new URL(link.href, document.baseURI);
	} catch {
		return undefined;
	}
	const here = window.location;
	if (url.origin !== here.origin) return undefined;
	const base = history.href("");
	if (base === "#") {
		if (url.pathname !== here.pathname || url.search !== here.search || !url.hash.startsWith("#/")) return undefined;
		return url.hash.slice(1);
	}
	const full = url.pathname + url.search + url.hash;
	if (!base) return full;
	if (full === base || full.startsWith(`${base}/`) || full.startsWith(`${base}?`) || full.startsWith(`${base}#`)) {
		const rest = full.slice(base.length);
		return rest.startsWith("/") ? rest : `/${rest}`;
	}
	return undefined;
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-navigate": CustomEvent<NavigateDetail>;
		"dj-nav-toggle": CustomEvent<{ open: boolean }>;
		"dj-nav-collapse": CustomEvent<{ collapsed: boolean }>;
	}
}
