import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-icon.styles.js";

export type IconSize = "small" | "medium" | "large";

/**
 * `<dj-icon>` — a presentational icon. Supply a glyph either by `type` (mapped to an
 * icon-font class `icon--<type>`) or by slotting an inline `<svg>`. `alt-text` makes
 * the icon meaningful to assistive tech; without it the icon is aria-hidden.
 *
 * Parts: `base`.
 *
 * @cssprop [--dj-icon-color=currentColor] - Icon color.
 */
export class DjIcon extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	/** Icon type/name; applied as the class `icon--<type>` for icon-font themes. */
	@property() type = "";

	/** Size modifier. */
	@property({ reflect: true }) size?: IconSize;

	/** Visually-hidden label; when set, the icon is exposed to assistive tech. */
	@property({ attribute: "alt-text" }) altText?: string;

	override render() {
		return html`<i
			part="base"
			class="icon ${this.type ? `icon--${this.type}` : ""} ${this.size ? `icon--${this.size}` : ""}"
			role="img"
			aria-hidden=${this.altText ? "false" : "true"}
			aria-label=${this.altText ?? nothing}
		>
			<slot></slot>
		</i>`;
	}
}
export default DjIcon;
