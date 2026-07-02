import { html, css, nothing, type TemplateResult } from "lit"; import { property, state } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element"; import "@dojo-ng/icon";
export interface TreeNode { id: string; label: string; children?: TreeNode[]; }
/**
 * `<dj-tree>` — a hierarchical tree from `nodes`. Click a parent's chevron to expand; click a
 * node to select. Emits `dj-select` with the id. Functional core (no virtualization/drag/checkboxes yet).
 */
export class DjTree extends DojoElement {
	static override version="0.1.0";
	static override focusable = true;
	static override styles=[css`
		:host{display:block;} ul{list-style:none;margin:0;padding:0;} ul ul{margin-inline-start:1.1rem;}
		.row{display:flex;align-items:center;gap:.25rem;padding:.2rem .35rem;border-radius:var(--dj-input-border-radius-small,.1875rem);cursor:pointer;color:var(--dj-color-text,#1f2937);}
		.row:hover{background:var(--dj-color-neutral-100,#f3f4f6);} .row--selected{background:var(--dj-color-primary-100,#dbeafe);color:var(--dj-color-primary-700,#1d4ed8);}
		.row:focus-visible{outline:var(--dj-focus-ring,2px solid currentColor);outline-offset:-2px;}
		.chev{display:inline-flex;width:1rem;transition:transform var(--dj-transition-x-fast,100ms);} .chev--open{transform:rotate(90deg);} .spacer{width:1rem;display:inline-block;}
		/* Forced colors: the selected row's tint collapses, so use the system selected pair. */
		@media (forced-colors: active){ .row--selected{background:Highlight;color:HighlightText;} }
	`, reducedMotion];
	@property({type:Array}) nodes: TreeNode[] = [];
	@property() value = "";
	@state() private expanded = new Set<string>();
	private toggle(id:string){ const s=new Set(this.expanded); s.has(id)?s.delete(id):s.add(id); this.expanded=s; }
	private select(id:string){ this.value=id; this.emit("dj-select",{detail:{id}}); }
	private renderNode(node: TreeNode): TemplateResult {
		const hasChildren = !!node.children?.length;
		const open = this.expanded.has(node.id);
		return html`<li role="treeitem" aria-expanded=${hasChildren?(open?"true":"false"):nothing} aria-selected=${node.id===this.value?"true":"false"}>
			<div class="row ${node.id===this.value?"row--selected":""}" tabindex="0"
				@click=${()=>{ if(hasChildren) this.toggle(node.id); this.select(node.id); }}
				@keydown=${(e:KeyboardEvent)=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault(); this.select(node.id);} else if(e.key==="ArrowRight"&&hasChildren&&!open){this.toggle(node.id);} else if(e.key==="ArrowLeft"&&hasChildren&&open){this.toggle(node.id);} }}>
				${hasChildren?html`<span class="chev ${open?"chev--open":""}" @click=${(e:Event)=>{e.stopPropagation(); this.toggle(node.id);}}><dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></span>`:html`<span class="spacer"></span>`}
				<span class="label">${node.label}</span>
			</div>
			${hasChildren&&open?html`<ul role="group">${node.children!.map(c=>this.renderNode(c))}</ul>`:nothing}
		</li>`;
	}
	override render(){ return html`<ul role="tree">${this.nodes.map(n=>this.renderNode(n))}</ul>`; }
}
export default DjTree;
declare global { interface GlobalEventHandlersEventMap { "dj-select": CustomEvent<{ id: string }>; } }
