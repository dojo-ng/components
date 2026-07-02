import { html, css, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/card";
/**
 * `<dj-header-card>` — a `<dj-card>` with a header row (avatar + title/subtitle). Slots:
 * `avatar`, default (content), `actions`.
 */
export class DjHeaderCard extends DojoElement {
	static override styles = css`
		:host { display: block; }
		.header { display: flex; align-items: center; gap: var(--dj-spacing-small, 0.75rem); padding: var(--dj-spacing-medium, 1rem); padding-bottom: 0; }
		.title { margin: 0; font-size: 1.1rem; }
		.subtitle { margin: 0.1rem 0 0; font-size: 0.9rem; color: var(--dj-color-text-muted, #6b7280); }
	`;
	static override version = "0.1.0";
	@property() title = "";
	@property() subtitle = "";
	@property() kind: "elevated" | "outlined" = "elevated";
	override render() {
		return html`<dj-card kind=${this.kind}>
			<div slot="header" class="header">
				<slot name="avatar"></slot>
				<div><h2 class="title">${this.title}</h2>${this.subtitle ? html`<h3 class="subtitle">${this.subtitle}</h3>` : nothing}</div>
			</div>
			<slot></slot>
			<slot name="actions" slot="actions"></slot>
		</dj-card>`;
	}
}
export default DjHeaderCard;
