import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { dismissOnFocusOut } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import "@dojo-ng/icon";
import type { ListOption } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-toolbar.styles.js";

registerDefaults("dj", { moreActions: "More actions" });

const KEBAB = html`<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg></dj-icon>`;

/**
 * `<dj-toolbar>` — a horizontal action bar with `role="toolbar"`.
 *
 * #### Layout
 * - The `leading` slot holds a logo or a menu or back button.
 * - The default slot holds the title or other content.
 * - The `actions` slot holds the primary action buttons, aligned to the end.
 * - `sticky` pins the bar to the top.
 *
 * #### Overflow menu
 * - Set the `overflow` property to a list of options to put secondary actions in a menu. A `⋮`
 *   button opens them in a popup `<dj-list>`.
 * - Choosing one emits `dj-action` with its value.
 * - The menu closes when an item is chosen, on Escape, on a click outside, and when focus leaves
 *   it.
 *
 * #### Not built
 * - Moving slotted actions into the menu automatically when space runs out. For now your app
 *   decides which actions are primary and which go in `overflow`.
 *
 * Slots:
 *  - `leading`: a logo, or a menu or back button.
 *  - (default): the title or other content.
 *  - `actions`: the primary action buttons, aligned to the end.
 * Parts: `bar`, `leading`, `title`, `actions`, `overflow`. Event: `dj-action` (detail: `{ value }`).
 *
 */
export class DjToolbar extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;

	#i18n = new LocaleController(this);
	@query(".more") private moreBtn?: HTMLElement;

	/** Accessible name for the toolbar (sets `aria-label` on the bar). */
	@property() label?: string;
	@property({ type: Boolean, reflect: true }) sticky = false;
	/** Secondary actions rendered behind the overflow (`⋮`) button. */
	@property({ attribute: false }) overflow: ListOption[] = [];
	@property({ attribute: "overflow-position", reflect: true }) overflowPosition: PopupPosition = "below";
	@state() private open = false;

	#disposeFocusOut?: () => void;
	override connectedCallback() {
		super.connectedCallback();
		this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; });
	}
	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#disposeFocusOut?.();
	}

	private toggle() {
		this.open = !this.open;
		if (this.open) {
			void this.updateComplete.then(() =>
				this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus(),
			);
		}
	}
	private onMoreKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (!this.open) this.toggle();
		}
	}
	private onSelect(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		this.open = false;
		this.emit("dj-action", { detail: { value } });
		this.moreBtn?.focus();
	}

	override render() {
		const hasOverflow = this.overflow.length > 0;
		return html`
			<div class="bar" part="bar" role="toolbar" aria-orientation="horizontal" aria-label=${this.label ?? nothing}>
				<span class="leading" part="leading"><slot name="leading"></slot></span>
				<span class="title" part="title"><slot></slot></span>
				<span class="actions" part="actions">
					<slot name="actions"></slot>
					${hasOverflow
						? html`
								<button
									class="more"
									part="overflow"
									type="button"
									aria-haspopup="menu"
									aria-expanded=${this.open ? "true" : "false"}
									aria-label=${messages.resolve("dj", this.#i18n.locale, "moreActions") ?? "More actions"}
									@click=${() => this.toggle()}
									@keydown=${this.onMoreKey}
								>
									${KEBAB}
								</button>
								<dj-popup
									.anchor=${this.moreBtn}
									.open=${this.open}
									position=${this.overflowPosition}
									.scrollLock=${false}
									@dj-close=${() => { this.open = false; }}
								>
									<dj-list menu .options=${this.overflow} @change=${(e: Event) => this.onSelect(e)}></dj-list>
								</dj-popup>
							`
						: nothing}
				</span>
			</div>
		`;
	}
}
export default DjToolbar;

declare global {
	interface HTMLElementTagNameMap { "dj-toolbar": DjToolbar; }
	interface GlobalEventHandlersEventMap { "dj-action": CustomEvent<{ value: string }>; }
}
