import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/icon";
import styles from "./dj-result.styles.js";
const PATHS: Record<string, string> = {
	success: "M5 13l4 4 10-10",
	error: "M6 6l12 12M18 6L6 18",
	alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
	info: "M12 8h.01M11 12h1v5h1",
};
/**
 * `<dj-result>` — a status/result block with an icon, title, subtitle, content, and actions.
 * `status` (success|error|alert|info) sets a default icon + color; override via the `icon`
 * slot. Slots: `icon`, default (content), `actions`. Parts: `root`, `status`.
 */
export class DjResult extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	@property() title = "";
	@property() subtitle = "";
	@property({ reflect: true }) status?: "alert" | "error" | "info" | "success";
	override render() {
		return html`<div part="root" class="root">
			${this.status ? html`<span part="status" class="status status--${this.status}"><slot name="icon"><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[this.status]}" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></slot></span>` : html`<slot name="icon"></slot>`}
			${this.title ? html`<h2 class="title">${this.title}</h2>` : nothing}
			${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : nothing}
			<slot></slot>
			<div class="actions"><slot name="actions"></slot></div>
		</div>`;
	}
}
export default DjResult;
