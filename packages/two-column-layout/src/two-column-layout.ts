import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-two-column-layout>` — leading + trailing slots; collapses to one column on narrow containers (container query). */
export class DjTwoColumnLayout extends DojoElement {
	static override version="0.1.0";
	static override styles = css`
		:host{display:block;container-type:inline-size;}
		.grid{display:grid;gap:var(--dj-spacing-medium,1rem);grid-template-columns:1fr 1fr;}
		:host([bias="leading"]) .grid{grid-template-columns:2fr 1fr;} :host([bias="trailing"]) .grid{grid-template-columns:1fr 2fr;}
		@container (max-width: 600px){ .grid{grid-template-columns:1fr;} }
		@supports not (container-type: inline-size){ @media (max-width: 600px){ .grid{grid-template-columns:1fr;} } }
	`;
	@property({reflect:true}) bias?:"leading"|"trailing";
	override render(){ return html`<div class="grid"><div part="leading"><slot name="leading"></slot></div><div part="trailing"><slot name="trailing"></slot></div></div>`; }
}
export default DjTwoColumnLayout;
