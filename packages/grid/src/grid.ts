import { html, css, nothing } from "lit"; import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element"; import "@dojo-ng/icon";
export interface GridColumn { id: string; title: string; sortable?: boolean; }
/**
 * `<dj-grid>` — a data grid from `columns` + `rows`. Click a sortable header to sort (emits
 * `dj-sort`). Functional core: no virtualization, paging, editing, or column resize yet. Part: `table`.
 */
export class DjGrid extends DojoElement {
	static override version="0.1.0";
	static override styles=css`
		:host{display:block;overflow:auto;} table{border-collapse:collapse;width:100%;font-size:var(--dj-font-size-medium,1rem);}
		th,td{text-align:start;padding:var(--dj-spacing-x-small,.5rem) var(--dj-spacing-small,.75rem);border-bottom:1px solid var(--dj-color-border,#d1d5db);}
		th{color:var(--dj-color-text-muted,#6b7280);font-weight:var(--dj-font-weight-semibold,600);white-space:nowrap;}
		th.sortable{cursor:pointer;} th.sortable:hover{color:var(--dj-color-text,#1f2937);}
		.th-inner{display:inline-flex;align-items:center;gap:.25rem;} .sort{display:inline-flex;opacity:.6;}
		tbody tr:hover{background:var(--dj-color-neutral-50,#f9fafb);}
	`;
	@property({type:Array}) columns: GridColumn[] = [];
	@property({type:Array}) rows: Record<string, unknown>[] = [];
	@state() private sortCol?: string;
	@state() private sortDir: "asc" | "desc" = "asc";
	private onSort(col: GridColumn){
		if(!col.sortable) return;
		if(this.sortCol===col.id){ this.sortDir = this.sortDir==="asc"?"desc":"asc"; } else { this.sortCol=col.id; this.sortDir="asc"; }
		this.emit("dj-sort",{detail:{column:col.id,direction:this.sortDir}});
	}
	private get sortedRows(){
		if(!this.sortCol) return this.rows;
		const col=this.sortCol, dir=this.sortDir==="asc"?1:-1;
		return [...this.rows].sort((a,b)=>{ const av=a[col], bv=b[col]; if(av==null) return 1; if(bv==null) return -1; return av<bv?-dir:av>bv?dir:0; });
	}
	override render(){
		return html`<table part="table" role="grid">
			<thead><tr>${this.columns.map(c=>html`<th class=${c.sortable?"sortable":""} role="columnheader" aria-sort=${this.sortCol===c.id?(this.sortDir==="asc"?"ascending":"descending"):nothing} @click=${()=>this.onSort(c)}>
				<span class="th-inner">${c.title}${c.sortable?html`<span class="sort"><dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true">${this.sortCol===c.id?(this.sortDir==="asc"?html`<path d="M12 8l-4 4h8z" fill="currentColor"/>`:html`<path d="M12 16l4-4H8z" fill="currentColor"/>`):html`<path d="M8 10l4-4 4 4M8 14l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2"/>`}</svg></dj-icon></span>`:nothing}</span>
			</th>`)}</tr></thead>
			<tbody>${this.sortedRows.map(r=>html`<tr>${this.columns.map(c=>html`<td>${String(r[c.id] ?? "")}</td>`)}</tr>`)}</tbody>
		</table>`;
	}
}
export default DjGrid;
declare global { interface GlobalEventHandlersEventMap { "dj-sort": CustomEvent<{ column: string; direction: "asc" | "desc" }>; } }
