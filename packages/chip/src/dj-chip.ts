import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/icon";
import styles from "./dj-chip.styles.js";
/**
 * `<dj-chip>` — compact label/tag. Label in the default slot, optional icon in the `icon`
 * slot. `clickable` wraps the body in a real `<button>` (native Enter/Space; the click bubbles
 * from the host); `closeable` shows a separate close `<button>` that emits `dj-close`. The two
 * are siblings, never nested, so a clickable + closeable chip stays valid ARIA. Parts: `root`,
 * `action`, `close`.
 */
export class DjChip extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) checked = false;
	@property({ type: Boolean }) clickable = false;
	@property({ type: Boolean }) closeable = false;
	/** Accessible name for the close button (defaults to "Remove"); set it to name what is being removed. */
	@property({ attribute: "close-label" }) closeLabel?: string;

	override render() {
		const interactive = this.clickable && !this.disabled;
		// The body: a real <button> when interactive (native keyboard, click bubbles to the host),
		// a plain <span> otherwise. The close button is a SIBLING — never nested inside the body —
		// so a clickable + closeable chip has two adjacent controls, not one inside another.
		const body = html`<span class="icon"><slot name="icon"></slot></span><span class="label"><slot></slot></span>`;
		return html`<div part="root" class="root">
			${interactive
				? html`<button part="action" class="action" type="button">${body}</button>`
				: html`<span part="action" class="action">${body}</span>`}
			${this.closeable ? html`<button part="close" class="close" type="button" aria-label=${this.closeLabel || "Remove"} @click=${(e: Event) => { e.stopPropagation(); this.emit("dj-close"); }}>
				<dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon></button>` : nothing}
		</div>`;
	}
}
export default DjChip;
declare global { interface GlobalEventHandlersEventMap { "dj-close": CustomEvent<Record<string, never>>; } }
