import { html, css } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/popup";

/**
 * `<dj-context-popup>` — right-click (contextmenu) on the trigger (default slot) opens a
 * `<dj-popup>` at the cursor, holding the `content` slot.
 */
export class DjContextPopup extends DojoElement {
	static override styles = css`:host { display: inline-block; }`;
	static override version = "0.1.0";
	@property({ type: Boolean, reflect: true }) open = false;
	@state() private x = 0;
	@state() private y = 0;

	private onContextMenu(e: MouseEvent) {
		e.preventDefault();
		this.x = e.clientX; this.y = e.clientY;
		this.open = true;
		this.emit("dj-open");
	}

	override render() {
		return html`
			<span class="trigger" @contextmenu=${(e: MouseEvent) => this.onContextMenu(e)}><slot></slot></span>
			<dj-popup
				.open=${this.open}
				.xLeft=${this.x} .xRight=${this.x} .yTop=${this.y} .yBottom=${this.y}
				position="below"
				@dj-close=${() => { this.open = false; }}
			><slot name="content"></slot></dj-popup>
		`;
	}
}
export default DjContextPopup;
declare global { interface GlobalEventHandlersEventMap { "dj-open": CustomEvent<Record<string, never>>; } }
