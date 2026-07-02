import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-card.styles.js";
/**
 * `<dj-card>` — content container. Slots: `header`, default (content), `actions`. Optional
 * `title`/`subtitle`/`media-src`. `clickable` makes the body a button. Parts: `root`, `media`, `body`, `actions`.
 */
export class DjCard extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	@property({ reflect: true }) kind: "elevated" | "outlined" = "elevated";
	@property({ type: Boolean }) square = false;
	@property() title = "";
	@property() subtitle = "";
	@property({ attribute: "media-src" }) mediaSrc?: string;
	@property({ attribute: "media-title" }) mediaTitle?: string;
	@property({ type: Boolean }) clickable = false;
	override render() {
		return html`<div part="root" class="root">
			<div part="body" class="body ${this.clickable ? "clickable" : ""}" role=${this.clickable ? "button" : nothing} tabindex=${this.clickable ? 0 : nothing}>
				<slot name="header"></slot>
				${this.mediaSrc ? html`<div part="media" class="media ${this.square ? "media--square" : "media--16x9"}" title=${this.mediaTitle ?? nothing} style=${`background-image:url("${this.mediaSrc}")`}></div>` : nothing}
				${this.title ? html`<div class="title-wrap"><h2 class="title">${this.title}</h2>${this.subtitle ? html`<h3 class="subtitle">${this.subtitle}</h3>` : nothing}</div>` : nothing}
				<slot></slot>
			</div>
			<slot name="actions" part="actions" class="actions"></slot>
		</div>`;
	}
}
export default DjCard;
