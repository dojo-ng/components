import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-icon.styles.js";
import { getIcon, onIconsChanged } from "./registry.js";

export type IconSize = "small" | "medium" | "large";

/**
 * `<dj-icon>` — a presentational icon.
 *
 * Supply a glyph in one of two ways: set `type` to the name of an icon registered with
 * `registerIcon` or `registerIcons`, or slot an inline `<svg>`.
 *
 * #### Accessibility
 * - Set `alt-text` when the icon carries meaning. It becomes the accessible name.
 * - Without `alt-text`, the icon is hidden from assistive technology (`aria-hidden`).
 *
 * #### SVG requirements
 * - A registered SVG must have a `viewBox`. dj-icon sizes a glyph by stretching it to fill
 *   the icon box, and an `<svg>` scales its artwork only when it has a `viewBox`.
 * - An SVG without a `viewBox` gets a box of the right size, but its artwork is clipped or
 *   not scaled. `registerIcon` and `registerIcons` log one console warning for each such icon,
 *   and they do not change the SVG.
 * - dj-icon's own sizing overrides any `width` or `height` attributes on a registered SVG.
 * - A slotted inline `<svg>` follows the same rules.
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
