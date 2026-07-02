import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-avatar.styles.js";
/** `<dj-avatar>` — circular/rounded/square avatar from an image `src` or slotted initials/icon. Part: `base`. */
export class DjAvatar extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	@property({ reflect: true }) type: "circle" | "square" | "rounded" = "circle";
	@property({ reflect: true }) size: "small" | "medium" | "large" = "medium";
	@property() src?: string;
	@property() alt?: string;
	@property({ type: Boolean, reflect: true }) secondary = false;
	@property({ type: Boolean, reflect: true }) outline = false;
	override render() {
		return html`<div part="base" class="base" role=${this.src ? "img" : nothing} aria-label=${this.alt ?? nothing}
			style=${this.src ? `background-image:url("${this.src}")` : nothing}><slot></slot></div>`;
	}
}
export default DjAvatar;
