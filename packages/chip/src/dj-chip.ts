import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/icon";
import styles from "./dj-chip.styles.js";
/**
 * `<dj-chip>` — compact label/tag. Label in the default slot, optional icon in the `icon`
 * slot. `clickable` makes it a button (Enter/Space), `closeable` shows a close affordance
 * that emits `dj-close`. Parts: `root`, `close`.
 */
export class DjChip extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) checked = false;
	@property({ type: Boolean }) clickable = false;
	@property({ type: Boolean }) closeable = false;

	private activate() { if (this.clickable && !this.disabled) this.click(); }
	private onKey(e: KeyboardEvent) { if (this.clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.activate(); } }

	override render() {
		const clickable = this.clickable && !this.disabled;
		return html`<div part="root" class="root ${clickable ? "clickable" : ""}"
			role=${clickable ? "button" : nothing} tabindex=${clickable ? 0 : nothing}
			@keydown=${(e: KeyboardEvent) => this.onKey(e)}>
			<span class="icon"><slot name="icon"></slot></span>
			<span class="label"><slot></slot></span>
			${this.closeable ? html`<button part="close" class="close" type="button" aria-label="Remove" @click=${(e: Event) => { e.stopPropagation(); this.emit("dj-close"); }}>
				<dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon></button>` : nothing}
		</div>`;
	}
}
export default DjChip;
declare global { interface GlobalEventHandlersEventMap { "dj-close": CustomEvent<Record<string, never>>; } }
