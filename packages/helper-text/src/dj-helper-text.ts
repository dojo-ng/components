import { html } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-helper-text.styles.js";

/**
 * `<dj-helper-text>` — supporting text shown under a form control. Provide text via the
 * `text` attribute, or slot richer content. `valid` (tri-state) tints the text.
 *
 * Parts: `base`, `text`.
 */
export class DjHelperText extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	@property() text?: string;
	/** Tri-state validity: true (valid), false (invalid), undefined (neutral). */
	@property({ type: Boolean }) valid?: boolean;

	override render() {
		const cls = `root ${this.valid === true ? "root--valid" : ""} ${
			this.valid === false ? "root--invalid" : ""
		}`;
		return html`<div part="base" class=${cls}>
			${this.text
				? html`<p part="text" class="text" aria-hidden="true" title=${this.text}>${this.text}</p>`
				: html`<slot></slot>`}
		</div>`;
	}
}
export default DjHelperText;
