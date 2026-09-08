import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-header>` — app header bar. `sticky` pins it. Slots: `leading`, default (title), `trailing`.
 *
 * @cssprop [--dj-header-z-index=700] - Stacking order of the header. */
export class DjHeader extends DojoElement {
	static override version="0.1.1";
	static override styles = css`
		:host{display:block;} :host([sticky]){position:sticky;top:0;z-index:var(--dj-header-z-index,700);}
		.bar{display:flex;align-items:center;gap:var(--dj-spacing-small,.75rem);padding:var(--dj-spacing-small,.75rem) var(--dj-spacing-medium,1rem);
			background:var(--dj-color-neutral-50,#f9fafb);border-bottom:1px solid var(--dj-color-border,#d1d5db);color:var(--dj-color-text,#1f2937);}
		.title{flex:1 1 auto;font-weight:var(--dj-font-weight-semibold,600);}
	`;
	@property({type:Boolean,reflect:true}) sticky=false;
	override render(){ return html`<div class="bar" role="banner"><slot name="leading"></slot><span class="title"><slot></slot></span><slot name="trailing"></slot></div>`; }
}
export default DjHeader;
