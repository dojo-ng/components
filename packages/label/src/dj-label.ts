import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-label.styles.js";

/**
 * `<dj-label>` — a form label. Content goes in the default slot.
 *
 * Note: native `for`/`id` association does not cross shadow boundaries, so associate by
 * wrapping the control in the label's light DOM, or rely on the consuming field
 * component to wire ARIA. `for-id` is still reflected for same-root cases.
 *
 * Deviates from the Dojo widget in one name: the visually-hidden flag is
 * `visually-hidden` (not `hidden`) to avoid clobbering the native `hidden` attribute.
 *
 * Parts: `base`.
 */
export class DjLabel extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) focused = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ type: Boolean, reflect: true }) readonly = false;
	@property({ type: Boolean, reflect: true }) secondary = false;
	@property({ type: Boolean, reflect: true }) active = false;
	/** Visually hide the label while keeping it accessible. */
	@property({ type: Boolean, reflect: true, attribute: "visually-hidden" }) visuallyHidden = false;
	/** Tri-state validity: true (valid), false (invalid), undefined (unset). */
	@property({ type: Boolean }) valid?: boolean;
	/** Id of the control to associate (effective only within the same root). */
	@property({ attribute: "for-id" }) forId?: string;

	override render() {
		return html`<label
			part="base"
			class="label
				${this.disabled ? "label--disabled" : ""}
				${this.focused ? "label--focused" : ""}
				${this.secondary ? "label--secondary" : ""}
				${this.active ? "label--active" : ""}
				${this.required ? "label--required" : ""}
				${this.valid === true ? "label--valid" : ""}
				${this.valid === false ? "label--invalid" : ""}"
			for=${this.forId ?? nothing}
		>
			<slot></slot>
		</label>`;
	}
}
export default DjLabel;
