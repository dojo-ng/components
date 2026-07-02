import { html, css } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";

export type ThemeName = "light" | "dark" | "auto";

/**
 * `<dj-theme theme="dark">` — scopes a theme to a subtree. It sets `data-dj-theme` on
 * itself so the token rules in `theme.css` apply, and those tokens inherit through the
 * slot into descendants and their shadow roots. `auto` removes the attribute so the
 * subtree inherits the ambient theme (or the OS via prefers-color-scheme at the root).
 *
 * Requires `theme.css` to be loaded once at the page level.
 */
export class DjTheme extends DojoElement {
	static override styles = css`
		:host { display: contents; }
	`;
	static override version = "0.1.0";

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
