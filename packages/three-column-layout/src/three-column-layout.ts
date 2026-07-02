import { html, css } from "lit"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-three-column-layout>` — leading/center/trailing slots; collapses on narrow containers. */
export class DjThreeColumnLayout extends DojoElement {
	static override version="0.1.0";
	static override styles = css`
		:host{display:block;container-type:inline-size;}
		.grid{display:grid;gap:var(--dj-spacing-medium,1rem);grid-template-columns:1fr 2fr 1fr;}
		@container (max-width: 1024px){ .grid{grid-template-columns:2fr 1fr;} .grid > .trailing{display:none;} }
		@container (max-width: 600px){ .grid{grid-template-columns:1fr;} .grid > .leading{display:none;} }
		@supports not (container-type: inline-size){
			@media (max-width: 1024px){ .grid{grid-template-columns:2fr 1fr;} .grid > .trailing{display:none;} }
			@media (max-width: 600px){ .grid{grid-template-columns:1fr;} .grid > .leading{display:none;} }
		}
	`;
	override render(){ return html`<div class="grid"><div class="leading" part="leading"><slot name="leading"></slot></div><div class="center" part="center"><slot name="center"></slot></div><div class="trailing" part="trailing"><slot name="trailing"></slot></div></div>`; }
}
export default DjThreeColumnLayout;
