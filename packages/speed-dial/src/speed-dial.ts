import { html, css } from "lit"; import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element"; import "@dojo-ng/floating-action-button"; import "@dojo-ng/icon";
/**
 * `<dj-speed-dial>` — a FAB that reveals slotted action buttons (`actions` slot) when open.
 * Toggles on click. `direction` controls where actions expand. Emits `dj-toggle` {open}.
 */
export class DjSpeedDial extends DojoElement {
	static override version="0.1.0";
	static override styles=css`
		:host{display:inline-block;position:relative;}
		.actions{display:flex;gap:var(--dj-spacing-x-small,.5rem);position:absolute;}
		:host([direction="up"]) .actions{flex-direction:column-reverse;bottom:calc(100% + .5rem);left:50%;transform:translateX(-50%);}
		:host([direction="down"]) .actions{flex-direction:column;top:calc(100% + .5rem);left:50%;transform:translateX(-50%);}
		:host([direction="left"]) .actions{flex-direction:row-reverse;right:calc(100% + .5rem);top:50%;transform:translateY(-50%);}
		:host([direction="right"]) .actions{flex-direction:row;left:calc(100% + .5rem);top:50%;transform:translateY(-50%);}
		.actions[hidden]{display:none;}
	`;
	@property({type:Boolean,reflect:true}) open=false;
	@property({reflect:true}) direction:"up"|"down"|"left"|"right"="up";
	private toggle(){ this.open=!this.open; this.emit("dj-toggle",{detail:{open:this.open}}); }
	override render(){
		return html`<div class="actions" ?hidden=${!this.open}><slot name="actions"></slot></div>
			<dj-floating-action-button aria-label="Actions" aria-expanded=${this.open?"true":"false"} @click=${()=>this.toggle()}>
				<dj-icon slot="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon>
			</dj-floating-action-button>`;
	}
}
export default DjSpeedDial;
declare global { interface GlobalEventHandlersEventMap { "dj-toggle": CustomEvent<{ open: boolean }>; } }
