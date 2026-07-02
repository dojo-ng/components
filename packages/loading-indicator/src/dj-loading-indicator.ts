import { html } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-loading-indicator.styles.js";

export type LoadingType = "linear" | "circular-small" | "circular-medium" | "circular-large";

/**
 * `<dj-loading-indicator>` — a linear bar or circular spinner. `active` (default true)
 * toggles visibility while preserving layout. Exposes role="progressbar".
 *
 * Parts: `base`.
 *
 * @cssprop [--dj-loading-linear-height=4px] - Thickness of the linear (bar) indicator.
 */
export class DjLoadingIndicator extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	@property({ type: Boolean, reflect: true }) active = true;
	@property({ reflect: true }) type: LoadingType = "linear";

	override render() {
		if (!this.active) {
			return html`<div part="base" class="root inactive" role="progressbar" aria-hidden="true"></div>`;
		}
		if (this.type === "linear") {
			return html`<div part="base" class="root linear" role="progressbar">
				<div class="bar"></div>
			</div>`;
		}
		const size = this.type.replace("circular-", "");
		return html`<div part="base" class="root circular circular--${size}" role="progressbar">
			<svg class="spinner" viewBox="0 0 50 50">
				<circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
			</svg>
		</div>`;
	}
}
export default DjLoadingIndicator;
