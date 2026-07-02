import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/title-pane";
/**
 * `<dj-accordion>` — coordinates slotted `<dj-title-pane>` children. With `exclusive`, opening
 * one pane closes the others. Listens for each pane's `dj-toggle`.
 */
export class DjAccordion extends DojoElement {
	static override version="0.1.0";
	static override styles = css`:host{display:flex;flex-direction:column;gap:var(--dj-spacing-2x-small,.25rem);}`;
	@property({type:Boolean}) exclusive=false;
	constructor(){ super(); this.addEventListener("dj-toggle", this.onToggle as EventListener); }
	private panes(){ const slot=this.renderRoot.querySelector("slot"); return slot?slot.assignedElements({flatten:true}).filter(e=>e.localName==="dj-title-pane") as (HTMLElement & {open:boolean})[]:[]; }
	private onToggle = (e: Event) => {
		if (!this.exclusive) return;
		const target = e.target as HTMLElement;
		const detail = (e as CustomEvent<{open:boolean}>).detail;
		if (detail?.open) for (const p of this.panes()) if (p !== target) p.open = false;
	};
	override render(){ return html`<slot></slot>`; }
}
export default DjAccordion;
