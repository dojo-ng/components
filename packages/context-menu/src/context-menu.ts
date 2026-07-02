import { html, css } from "lit"; import { property, query } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element"; import "@dojo-ng/context-popup"; import "@dojo-ng/list";
import type { ListOption } from "@dojo-ng/list";
/** `<dj-context-menu>` — right-click the trigger (default slot) to open a menu of `options`; emits `dj-select` with the value. */
export class DjContextMenu extends DojoElement {
	static override version="0.1.0";
	static override styles=css`:host{display:inline-block;}`;
	@property({type:Array}) options: ListOption[] = [];
	@query("dj-context-popup") private cp!: HTMLElement & { open: boolean };
	private onSelect(e:Event){ const v=(e.target as HTMLElement&{value:string}).value; if(this.cp) this.cp.open=false; this.emit("dj-select",{detail:{value:v}}); }
	override render(){
		return html`<dj-context-popup><slot></slot>
			<dj-list slot="content" menu .options=${this.options} @change=${(e:Event)=>this.onSelect(e)}></dj-list>
		</dj-context-popup>`;
	}
}
export default DjContextMenu;
declare global { interface GlobalEventHandlersEventMap { "dj-select": CustomEvent<{ value: string }>; } }
