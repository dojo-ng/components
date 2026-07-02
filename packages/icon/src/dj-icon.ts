import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-icon.styles.js";
import { getIcon, onIconsChanged } from "./registry.js";

export type IconSize = "small" | "medium" | "large";

/**
 * `<dj-icon>` — a presentational icon. Supply a glyph either by `type` (a name
 * registered via `registerIcon`, resolved from the SVG icon registry) or by
 * slotting an inline `<svg>`. `alt-text` makes the icon meaningful to assistive
 * tech; without it the icon is aria-hidden.
 *
 * Parts: `base`.
 *
 * @cssprop [--dj-icon-color=currentColor] - Icon color.
 */
export class DjIcon extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	/** Registered icon name; resolved to an inline SVG from the icon registry. */
	@property() type = "";

	/** Size modifier. */
	@property({ reflect: true }) size?: IconSize;

	/** Visually-hidden label; when set, the icon is exposed to assistive tech. */
	@property({ attribute: "alt-text" }) altText?: string;

	#unsubscribe?: () => void;

	override connectedCallback() {
		super.connectedCallback();
		// Re-render if the named icon is registered after this element mounted.
		this.#unsubscribe = onIconsChanged(() => {
			if (this.type) this.requestUpdate();
		});
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
	}

	override render() {
		const svg = this.type ? getIcon(this.type) : undefined;
		return html`<i
			part="base"
			class="icon ${this.size ? `icon--${this.size}` : ""}"
			role="img"
			aria-hidden=${this.altText ? "false" : "true"}
			aria-label=${this.altText ?? nothing}
		>
			${svg ? unsafeHTML(svg) : html`<slot></slot>`}
		</i>`;
	}
}
export default DjIcon;
