import { html, css, nothing } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
export interface Crumb { label: string; href?: string; current?: boolean; }
/** `<dj-breadcrumb-group>` — a breadcrumb trail from `items`. Part: `list`. */
export class DjBreadcrumbGroup extends DojoElement {
	static override version="0.1.0";
	static override styles = css`
		:host{display:block;} ol{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:var(--dj-spacing-2x-small,.25rem);margin:0;padding:0;}
		a{color:var(--dj-color-primary-600,#2563eb);text-decoration:none;border-radius:2px;} a:hover{text-decoration:underline;}
		a:focus-visible{outline:var(--dj-focus-ring,2px solid currentColor);outline-offset:2px;}
		.sep{color:var(--dj-color-text-muted,#6b7280);} [aria-current]{color:var(--dj-color-text,#1f2937);font-weight:var(--dj-font-weight-semibold,600);}
	`;
	@property({type:Array}) items: Crumb[] = [];
	override render(){
		return html`<nav aria-label="Breadcrumb"><ol part="list">${this.items.map((c,i)=>html`<li>${i>0?html`<span class="sep" aria-hidden="true">/</span> `:nothing}${c.current||!c.href?html`<span aria-current=${c.current?"page":nothing}>${c.label}</span>`:html`<a href=${c.href}>${c.label}</a>`}</li>`)}</ol></nav>`;
	}
}
export default DjBreadcrumbGroup;
