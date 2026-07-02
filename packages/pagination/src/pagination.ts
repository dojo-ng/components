import { html, css, nothing } from "lit"; import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element"; import "@dojo-ng/icon";
/** `<dj-pagination>` — page navigation over `total` pages. Emits `dj-page` with the new page. Parts: `nav`, `page`. */
export class DjPagination extends DojoElement {
	static override version="0.1.0";
	static override styles=css`
		:host{display:block;} .nav{display:flex;align-items:center;gap:.15rem;}
		button{min-width:2rem;height:2rem;border:1px solid var(--dj-color-border,#d1d5db);background:var(--dj-color-background,#fff);color:var(--dj-color-text,#1f2937);border-radius:var(--dj-input-border-radius-small,.1875rem);cursor:pointer;font:inherit;}
		button:hover:not(:disabled){background:var(--dj-color-neutral-100,#f3f4f6);} button:disabled{opacity:.4;cursor:not-allowed;}
		button[aria-current]{background:var(--dj-color-primary-600,#2563eb);border-color:var(--dj-color-primary-600,#2563eb);color:var(--dj-color-neutral-0,#fff);}
		.ellipsis{padding:0 .25rem;color:var(--dj-color-text-muted,#6b7280);} button:focus-visible{outline:var(--dj-focus-ring,2px solid currentColor);outline-offset:2px;}
	`;
	@property({type:Number}) total=1;
	@property({type:Number}) page=1;
	@property({attribute:"sibling-count",type:Number}) siblingCount=1;
	private go(p:number){ const np=Math.min(this.total,Math.max(1,p)); if(np!==this.page){ this.page=np; this.emit("dj-page",{detail:{page:np}}); } }
	private pages(): (number|"…")[] {
		const t=this.total, c=this.page, s=this.siblingCount;
		const range=(a:number,b:number)=>{ const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; };
		if (t<=5+s*2) return range(1,t);
		const left=Math.max(2,c-s), right=Math.min(t-1,c+s);
		const out:(number|"…")[]=[1];
		if(left>2) out.push("…");
		out.push(...range(left,right));
		if(right<t-1) out.push("…");
		out.push(t);
		return out;
	}
	override render(){
		return html`<div part="nav" class="nav" role="navigation" aria-label="Pagination">
			<button type="button" aria-label="Previous page" ?disabled=${this.page<=1} @click=${()=>this.go(this.page-1)}><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></button>
			${this.pages().map(p=>p==="…"?html`<span class="ellipsis">…</span>`:html`<button part="page" type="button" aria-current=${p===this.page?"page":nothing} @click=${()=>this.go(p as number)}>${p}</button>`)}
			<button type="button" aria-label="Next page" ?disabled=${this.page>=this.total} @click=${()=>this.go(this.page+1)}><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></button>
		</div>`;
	}
}
export default DjPagination;
declare global { interface GlobalEventHandlersEventMap { "dj-page": CustomEvent<{ page: number }>; } }
