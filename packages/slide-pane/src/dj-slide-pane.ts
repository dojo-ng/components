import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { collectFocusables, trapTabKey, firstFocusable, reducedMotion, lockBodyScroll } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import styles from "./dj-slide-pane.styles.js";

registerDefaults("dj", { close: "Close" });

export type SlidePaneAlign = "left" | "right" | "top" | "bottom";

/**
 * `<dj-slide-pane>` — a panel that slides in from an edge. Slots: `title`, default
 * (content). Closes on Escape, the close button, and underlay click. Locks body scroll
 * while open. Emits `dj-close`. Width/height comes from `width` (px). Parts: `underlay`,
 * `pane`, `title`, `close`, `content`.
 *
 * @cssprop [--dj-slide-pane-size=320px] - Width (left/right) or height (top/bottom) of the pane.
 * @cssprop [--dj-slide-pane-z-index=931] - Stacking order of the pane.
 * @cssprop [--dj-slide-pane-underlay-z-index=930] - Stacking order of the pane underlay (scrim).
 */
export class DjSlidePane extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.1";

	@property({ type: Boolean, reflect: true }) open = false;
	@property({ reflect: true }) align: SlidePaneAlign = "left";
	@property({ type: Number }) width = 320;
	@property({ type: Boolean }) underlay = true;
	@property({ attribute: "close-text" }) closeText?: string;

	#i18n = new LocaleController(this);
	#releaseScroll?: () => void;

	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (!this.open) return;
		if (event.key === "Escape") { event.stopPropagation(); this.close(); return; }
		if (event.key === "Tab") trapTabKey(event, collectFocusables(this.renderRoot as ShadowRoot, this));
	};
	close() { if (!this.open) return; this.open = false; this.emit("dj-close"); }

	connectedCallback() { super.connectedCallback(); document.addEventListener("keydown", this.onKeyDown); }
	disconnectedCallback() { super.disconnectedCallback(); document.removeEventListener("keydown", this.onKeyDown); this.unlock(); }
	private lock() { if (!this.#releaseScroll) this.#releaseScroll = lockBodyScroll(); }
	private unlock() { this.#releaseScroll?.(); this.#releaseScroll = undefined; }
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (!changed.has("open")) return;
		if (this.open) {
			this.lock();
			const first = firstFocusable(this) ?? this.renderRoot.querySelector<HTMLElement>("[part=close]");
			first?.focus();
		} else {
			this.unlock();
		}
	}

	override render() {
		// Underlay only while open; the pane stays mounted so it can animate in and out.
		return html`
			${this.open
				? html`<div part="underlay" class="underlay ${this.underlay ? "underlay--visible" : ""}" @click=${() => this.close()}></div>`
				: nothing}
			<aside
				part="pane"
				class="pane pane--${this.align} ${this.open ? "pane--open" : ""}"
				style=${`--dj-slide-pane-size:${this.width}px`}
				role="dialog"
				aria-hidden=${this.open ? "false" : "true"}
			>
				<div part="title" class="title">
					<span class="title__text"><slot name="title"></slot></span>
					<button part="close" class="close" type="button" aria-label=${this.closeText ?? messages.resolve("dj", this.#i18n.locale, "close") ?? "Close"} @click=${() => this.close()}>
						<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon>
					</button>
				</div>
				<div part="content" class="content"><slot></slot></div>
			</aside>
		`;
	}
}
export default DjSlidePane;

declare global { interface GlobalEventHandlersEventMap { "dj-close": CustomEvent<Record<string, never>>; } }
