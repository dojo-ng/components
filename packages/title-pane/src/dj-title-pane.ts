import { html } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import "@dojo-ng/icon";
import styles from "./dj-title-pane.styles.js";

/**
 * `<dj-title-pane>` — a collapsible panel with a title bar. Content goes in the default
 * slot. Click the title (when `closeable`) to toggle; emits `dj-toggle` with `{ open }`.
 * Parts: `title`, `button`, `content`.
 */
export class DjTitlePane extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";

	@property() name = "";
	@property({ type: Boolean, reflect: true }) open = false;
	@property({ type: Boolean }) closeable = true;
	@property({ attribute: "heading-level", type: Number }) headingLevel?: number;

	private toggle() {
		if (!this.closeable) return;
		this.open = !this.open;
		this.emit("dj-toggle", { detail: { open: this.open } });
	}

	override render() {
		return html`
			<div part="title" class="title" role="heading" aria-level=${this.headingLevel ?? 3}>
				<button
					part="button"
					class="button"
					type="button"
					aria-expanded=${this.open ? "true" : "false"}
					?disabled=${!this.closeable}
					@click=${() => this.toggle()}
				>
					<span class="arrow"><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></span>
					<span>${this.name}</span>
				</button>
			</div>
			<div part="content" class="collapse">
				<div class="content"><div class="content__inner"><slot></slot></div></div>
			</div>
		`;
	}
}
export default DjTitlePane;

declare global { interface GlobalEventHandlersEventMap { "dj-toggle": CustomEvent<{ open: boolean }>; } }
