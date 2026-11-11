import { html, css } from "lit";
import { property, query } from "lit/decorators.js";
import DojoElement, { defaultTrueBoolean } from "@dojo-ng/dojo-element";
import "@dojo-ng/popup";
import type { PopupPosition } from "@dojo-ng/popup";

/**
 * `<dj-trigger-popup>` — clicking the trigger (default slot) opens a `<dj-popup>` anchored
 * to it, holding the `content` slot. `match-width` sizes the popup to the trigger; set
 * `match-width="false"` to size it to its content. Emits `dj-open` when it opens and `dj-close`
 * (on this element; it does not bubble) when it closes.
 */
export class DjTriggerPopup extends DojoElement {
	static override styles = css`:host { display: inline-block; } .content { box-sizing: border-box; }`;
	static override version = "0.1.1";
	@property({ type: Boolean, reflect: true }) open = false;
	@property({ reflect: true }) position: PopupPosition = "below";
	@property({ attribute: "match-width", type: Boolean, converter: defaultTrueBoolean }) matchWidth = true;
	@property({ attribute: "underlay-visible", type: Boolean }) underlayVisible = false;

	@query(".trigger") private triggerEl!: HTMLElement;

	private toggle() { this.open = !this.open; if (this.open) this.emit("dj-open"); }

	#onPopupClose() {
		if (!this.open) return;
		this.open = false;
		this.emit("dj-close", { bubbles: false, composed: false });
	}

	override render() {
		const width = this.matchWidth && this.triggerEl ? `${this.triggerEl.offsetWidth}px` : "auto";
		return html`
			<span class="trigger" @click=${() => this.toggle()}><slot></slot></span>
			<dj-popup
				.anchor=${this.triggerEl}
				.open=${this.open}
				position=${this.position}
				?underlay-visible=${this.underlayVisible}
				@dj-close=${() => this.#onPopupClose()}
			>
				<div class="content" style=${`width:${width}`}><slot name="content"></slot></div>
			</dj-popup>
		`;
	}
}
export default DjTriggerPopup;
declare global { interface GlobalEventHandlersEventMap { "dj-open": CustomEvent<Record<string, never>>; "dj-close": CustomEvent<Record<string, never>>; } }
