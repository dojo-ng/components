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
 * `<dj-nav>` — a nav landmark that collapses into a trigger + panel below a threshold. The
 * threshold is the `--dj-nav-collapsed` custom property (0 or 1), read via
 * `TokenFlagController` rather than a `breakpoint` prop, so it lives in the existing `--dj-*`
 * theme system and is container-aware: a nav inside a narrow sidebar on a wide screen collapses.
 * One arrangement is ever in the DOM — never both, hidden: the plain `<nav>` when expanded, or
 * the trigger plus (while open) a panel wrapping that same `<nav>` when collapsed.
 *
 * `panel` picks the collapsed presentation: `"drawer"` composes `<dj-slide-pane>` (its `align`
 * follows the reading direction); `"dropdown"` and `"overlay"` are positioned in this
 * component's own shadow DOM. This is a disclosure, not a menu button — the links are plain
 * slotted `<a>` elements in a `<nav>`, never `dj-list`/`dj-tree`, and the trigger carries no
 * `aria-haspopup`.
 *
 * Slots: default (the links — plain `<a>` elements), `trigger` (optional, replaces the built-in
 * three-bar mark).
 * Parts: `trigger`, `panel`, `nav`.
 * Events:
 *  - `dj-nav-toggle` (detail `{ open }`) — the panel opened or closed, from any cause.
 *  - `dj-nav-collapse` (detail `{ collapsed }`) — the arrangement flipped.
 *
 * @cssprop [--dj-nav-collapsed=1] - The threshold flag read by TokenFlagController; 0 keeps the inline arrangement, 1 collapses it. Any value a consumer sets (directly, inherited from `:root`, or from their own `@container`/`@media` rule) wins over the component's own 45rem default — set it directly for a permanent hamburger, set both branches to move the flip point, or set it to `initial` to release an inherited pin.
 * @cssprop [--dj-nav-gap=1rem] - Gap between links in the inline arrangement.
 * @cssprop --dj-slide-pane-size - Passed through to the drawer presentation.
 */
export class DjNav extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";

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

	#i18n = new LocaleController(this);
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
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this.#onDocumentKeydown);
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

	#renderNav() {
		return html`
			<nav part="nav" class="nav" aria-label=${this.label ?? this.#msg("navigation")}>
				<slot></slot>
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

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-nav-toggle": CustomEvent<{ open: boolean }>;
		"dj-nav-collapse": CustomEvent<{ collapsed: boolean }>;
	}
}
