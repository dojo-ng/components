import { html, css } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";

export type ThemeName = "light" | "dark" | "auto";

/**
 * `<dj-theme>` — scopes a theme to part of the page.
 *
 * Set `theme` to `light` or `dark`. dj-theme sets `data-dj-theme` on itself, so the token rules
 * in `theme.css` apply, and the tokens inherit into descendants and their shadow roots.
 *
 * - `auto` removes the attribute. The subtree then follows the surrounding theme, or the
 *   operating system setting at the page root.
 * - Load `theme.css` once for the page.
 */
export class DjTheme extends DojoElement {
	static override styles = css`
		:host { display: contents; }
	`;
	static override version = "0.1.2";

	@property() theme: ThemeName = "auto";

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("theme")) {
			if (this.theme === "auto") {
				this.removeAttribute("data-dj-theme");
			} else {
				this.setAttribute("data-dj-theme", this.theme);
			}
		}
	}

	override render() {
		return html`<slot></slot>`;
	}
}
export default DjTheme;
