import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { lockBodyScroll } from "@dojo-ng/dojo-element";
import styles from "./dj-popup.styles.js";

export type PopupPosition = "above" | "below" | "left" | "right";

/**
 * `<dj-popup>` — positions slotted content as an overlay, flipping to the opposite side
 * when there isn't room in the preferred position. Anchor it by setting the `anchor`
 * property to an element, or supply viewport coordinates via the `x-*`/`y-*` attributes.
 *
 * While open it locks body scroll and closes on Escape or underlay click, emitting a
 * `dj-close` event. Content goes in the default slot.
 *
 * Parts: `underlay`, `wrapper`.
 *
 * @cssprop [--dj-popup-z-index=901] - Stacking order of the popup.
 * @cssprop [--dj-popup-underlay-z-index=900] - Stacking order of the popup underlay.
 */
export class DjPopup extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	@property({ type: Boolean, reflect: true }) open = false;
	@property({ reflect: true }) position: PopupPosition = "below";
	@property({ type: Boolean, attribute: "underlay-visible", reflect: true }) underlayVisible = false;
	/** Lock body scroll while open (default true). Dropdowns set this false. */
	@property({ type: Boolean, attribute: "scroll-lock" }) scrollLock = true;

	/** Viewport-coordinate fallbacks used when no `anchor` element is set. */
	@property({ type: Number, attribute: "y-top" }) yTop = 0;
	@property({ type: Number, attribute: "y-bottom" }) yBottom = 0;
	@property({ type: Number, attribute: "x-left" }) xLeft = 0;
	@property({ type: Number, attribute: "x-right" }) xRight = 0;

	/** Element to anchor against (property only; takes precedence over x/y attributes). */
	anchor?: HTMLElement;

	// The wrapper's position is applied imperatively by `reposition()` (not via a
	// reactive binding), so positioning after render never schedules a second update.
	// This mirror string is kept for observability/tests; it is NOT reactive.
	private wrapperStyle = "opacity:0";
	#needsReposition = false;
	#releaseScroll?: () => void;
	#rafPending = false;
	#rafId = 0;
	#repositionWatching = false;
	#resizeObserver?: ResizeObserver;

	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && this.open) {
			this.close();
		}
	};

	/** Close the popup and emit `dj-close`. */
	close() {
		if (!this.open) return;
		this.open = false;
		this.emit("dj-close");
	}

	private anchorRect() {
		if (this.anchor && typeof this.anchor.getBoundingClientRect === "function") {
			return this.anchor.getBoundingClientRect();
		}
		return {
			top: this.yTop,
			bottom: this.yBottom,
			left: this.xLeft,
			right: this.xRight,
			width: this.xRight - this.xLeft,
			height: this.yBottom - this.yTop,
		} as DOMRect;
	}

	private reposition() {
		const wrapper = this.renderRoot?.querySelector<HTMLElement>(".wrapper");
		if (!wrapper) return;
		const rect = wrapper.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;
		const a = this.anchorRect();

		let pos = this.position;
		const fits = {
			below: a.bottom + h <= vh,
			above: a.top - h >= 0,
			left: a.left - w >= 0,
			right: a.right + w <= vw,
		};
		if (pos === "below" && !fits.below && fits.above) pos = "above";
		else if (pos === "above" && !fits.above && fits.below) pos = "below";
		else if (pos === "left" && !fits.left && fits.right) pos = "right";
		else if (pos === "right" && !fits.right && fits.left) pos = "left";

		let top: number;
		let left: number;
		if (pos === "above") {
			top = a.top - h;
			left = a.left;
		} else if (pos === "below") {
			top = a.bottom;
			left = a.left;
		} else {
			top = Math.max(a.top + a.height / 2 - h / 2, 0);
			left = pos === "left" ? a.left - w : a.right;
		}
		// Keep within the viewport.
		left = Math.min(Math.max(left, 0), Math.max(vw - w, 0));
		top = Math.min(Math.max(top, 0), Math.max(vh - h, 0));
		const t = Math.round(top);
		const l = Math.round(left);
		// Apply position imperatively — no reactive state write inside the update cycle.
		wrapper.style.top = `${t}px`;
		wrapper.style.left = `${l}px`;
		wrapper.style.opacity = "1";
		this.wrapperStyle = `top:${t}px;left:${l}px;opacity:1`;
	}

	/** Reposition at most once per animation frame, so a burst of scroll/resize
	 *  events collapses into a single layout pass. */
	private readonly scheduleReposition = () => {
		if (this.#rafPending) return;
		this.#rafPending = true;
		this.#rafId = requestAnimationFrame(() => {
			this.#rafPending = false;
			if (this.open) this.reposition();
		});
	};

	/** While open, keep the popup aligned to its anchor as the page scrolls,
	 *  the viewport resizes, or the anchor/content changes size. */
	private startRepositionWatch() {
		if (this.#repositionWatching) return;
		this.#repositionWatching = true;
		// Capture phase so scrolls in any nested scroll container are caught
		// (scroll events don't bubble); passive since we never preventDefault.
		window.addEventListener("scroll", this.scheduleReposition, { capture: true, passive: true });
		window.addEventListener("resize", this.scheduleReposition, { passive: true });
		if (typeof ResizeObserver !== "undefined") {
			this.#resizeObserver = new ResizeObserver(this.scheduleReposition);
			const wrapper = this.renderRoot?.querySelector<HTMLElement>(".wrapper");
			if (wrapper) this.#resizeObserver.observe(wrapper);
			if (this.anchor instanceof Element) this.#resizeObserver.observe(this.anchor);
		}
	}

	private stopRepositionWatch() {
		if (!this.#repositionWatching) return;
		this.#repositionWatching = false;
		window.removeEventListener("scroll", this.scheduleReposition, true);
		window.removeEventListener("resize", this.scheduleReposition);
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = undefined;
		if (this.#rafPending) {
			cancelAnimationFrame(this.#rafId);
			this.#rafPending = false;
		}
	}

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener("keydown", this.onKeyDown);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this.onKeyDown);
		this.unlockScroll();
		this.stopRepositionWatch();
	}

	private lockScroll() {
		if (!this.#releaseScroll) this.#releaseScroll = lockBodyScroll();
	}
	private unlockScroll() {
		this.#releaseScroll?.();
		this.#releaseScroll = undefined;
	}

	protected override willUpdate(changed: Map<PropertyKey, unknown>) {
		super.willUpdate(changed);
		if (changed.has("open")) {
			if (this.open) {
				this.#needsReposition = true;
			}
		}
	}

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("open")) {
			if (this.open) {
				if (this.scrollLock) this.lockScroll();
			} else {
				this.unlockScroll();
				this.stopRepositionWatch();
			}
		}
		if (this.open && this.#needsReposition) {
			this.#needsReposition = false;
			this.reposition();
			this.startRepositionWatch();
		}
	}

	override render() {
		if (!this.open) return nothing;
		return html`
			<div
				part="underlay"
				class="underlay ${this.underlayVisible ? "underlay--visible" : ""}"
				@click=${this.close}
			></div>
			<div part="wrapper" class="wrapper">
				<slot></slot>
			</div>
		`;
	}
}
export default DjPopup;

declare global {
	interface HTMLElementTagNameMap { "dj-popup": DjPopup; }
	interface GlobalEventHandlersEventMap { "dj-close": CustomEvent<Record<string, never>>; }
}
