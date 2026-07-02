import { html, css } from "lit"; import { property, query } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element"; import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n"; import "@dojo-ng/popup"; import "@dojo-ng/button";

registerDefaults("dj", { confirm: "OK", cancel: "Cancel" });
/**
 * `<dj-popup-confirmation>` — clicking the trigger (default slot) opens a small confirm
 * popup with the `content` slot and Confirm/Cancel buttons. Emits `dj-confirm` / `dj-cancel`.
 */
export class DjPopupConfirmation extends DojoElement {
	static override version="0.1.0";
	static override styles=css`:host{display:inline-block;} .panel{padding:var(--dj-spacing-medium,1rem);max-width:18rem;background:var(--dj-color-background,#fff);color:var(--dj-color-text,#1f2937);border:1px solid var(--dj-color-border,#d1d5db);border-radius:var(--dj-input-border-radius-medium,.25rem);box-shadow:0 8px 24px rgb(0 0 0 / .2);} .actions{display:flex;justify-content:flex-end;gap:var(--dj-spacing-x-small,.5rem);margin-top:var(--dj-spacing-x-small,.5rem);}`;
	@property({type:Boolean,reflect:true}) open=false;
	@property({attribute:"confirm-label"}) confirmLabel?: string;
	@property({attribute:"cancel-label"}) cancelLabel?: string;
	#i18n = new LocaleController(this);
	@query(".trigger") private trigger!: HTMLElement;
	private confirm(){ this.open=false; this.emit("dj-confirm"); }
	private cancel(){ this.open=false; this.emit("dj-cancel"); }
	override render(){
		return html`<span class="trigger" @click=${()=>{ this.open=!this.open; }}><slot></slot></span>
			<dj-popup .anchor=${this.trigger} .open=${this.open} position="below" underlay-visible .scrollLock=${false} @dj-close=${()=>{ this.open=false; this.emit("dj-cancel"); }}>
				<div class="panel"><slot name="content"></slot>
					<div class="actions"><dj-button kind="text" @click=${()=>this.cancel()}>${this.cancelLabel ?? messages.resolve("dj", this.#i18n.locale, "cancel") ?? "Cancel"}</dj-button><dj-button kind="contained" @click=${()=>this.confirm()}>${this.confirmLabel ?? messages.resolve("dj", this.#i18n.locale, "confirm") ?? "OK"}</dj-button></div>
				</div>
			</dj-popup>`;
	}
}
export default DjPopupConfirmation;
declare global { interface GlobalEventHandlersEventMap { "dj-confirm": CustomEvent<Record<string,never>>; "dj-cancel": CustomEvent<Record<string,never>>; } }
