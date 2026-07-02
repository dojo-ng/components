import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-stack>` — flex layout. direction/align/spacing/padding/stretch. */
export class DjStack extends DojoElement {
	static override version="0.1.0";
	static override styles = css`
		:host{display:block;} .stack{display:flex;}
		:host([direction="vertical"]) .stack{flex-direction:column;}
		:host([direction="horizontal"]) .stack{flex-direction:row;}
		:host([align="start"]) .stack{align-items:flex-start;} :host([align="middle"]) .stack{align-items:center;} :host([align="end"]) .stack{align-items:flex-end;}
		.sp-small{gap:var(--dj-spacing-x-small,.5rem);} .sp-medium{gap:var(--dj-spacing-medium,1rem);} .sp-large{gap:var(--dj-spacing-large,1.5rem);}
		.pd-small{padding:var(--dj-spacing-x-small,.5rem);} .pd-medium{padding:var(--dj-spacing-medium,1rem);} .pd-large{padding:var(--dj-spacing-large,1.5rem);}
		:host([stretch]) .stack{width:100%;height:100%;}
	`;
	@property({reflect:true}) direction:"vertical"|"horizontal"="vertical";
	@property({reflect:true}) align?:"start"|"middle"|"end";
	@property() spacing:"small"|"medium"|"large"="medium";
	@property() padding?:"small"|"medium"|"large";
	@property({type:Boolean,reflect:true}) stretch=false;
	override render(){ return html`<div class="stack sp-${this.spacing} ${this.padding?`pd-${this.padding}`:""}"><slot></slot></div>`; }
}
export default DjStack;
