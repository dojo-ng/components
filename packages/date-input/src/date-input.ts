import { html, css, nothing } from "lit"; import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, dismissOnFocusOut, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/text-input"; import "@dojo-ng/calendar"; import "@dojo-ng/popup"; import "@dojo-ng/icon";

registerDefaults("dj", { openCalendar: "Open calendar" });
/**
 * `<dj-date-input>` — an ISO (yyyy-mm-dd) date field: type it, or pick from a popup
 * `<dj-calendar>` opened by the trailing button. Form-associated. Composes text-input,
 * calendar, popup, icon.
 */
export class DjDateInput extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override version="0.1.0";
	static override focusable = true;
	static formAssociated=true;
	static override styles=css`:host{display:block;} .cal-btn{display:inline-flex;align-items:center;justify-content:center;min-width:1.5rem;min-height:1.5rem;border:none;background:transparent;cursor:pointer;color:var(--dj-color-text-muted,#6b7280);padding:0 .25rem;border-radius:2px;} .cal-btn:focus-visible{outline:var(--dj-focus-ring,2px solid currentColor);outline-offset:2px;}`;
	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query("dj-text-input") private field!: HTMLElement & { value: string; focus(): void };
	@property() value=""; @property({ reflect: true }) name?: string; @property() label?: string;
	@property() min?: string; @property() max?: string;
	@property({type:Boolean,reflect:true}) disabled=false; @property({type:Boolean,reflect:true}) required=false;
	@state() private open=false;
	constructor(){ super(); this.#internals=this.attachInternals(); }
	get validity(){ return this.#internals.validity; }
	checkValidity(){ return this.#internals.checkValidity(); }
	formResetCallback(){ this.value=this.getAttribute("value")??""; this.sync(); }
	#disposeFocusOut?: () => void;
	override connectedCallback(){ super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; }); }
	override disconnectedCallback(){ super.disconnectedCallback(); this.#disposeFocusOut?.(); }
	private sync(){ this.#internals.setFormValue(this.value||null); if(this.required&&!this.value) this.#internals.setValidity({valueMissing:true},"Please enter a date.",this.field); else this.#internals.setValidity({}); }
	protected override firstUpdated(){ this.sync(); }
	protected override updated(c:Map<PropertyKey,unknown>){ if(c.has("value")) this.sync(); }
	private onInput(e:Event){ this.value=(e.target as HTMLInputElement).value; this.sync(); }
	private onPick(e:Event){ e.stopPropagation(); this.value=(e.target as HTMLElement&{value:string}).value; this.open=false; this.sync(); this.emit("change"); this.field?.focus(); }
	override render(){
		return html`
			<dj-text-input .value=${this.value} label=${this.label??nothing} placeholder="yyyy-mm-dd" ?disabled=${this.isDisabled} ?required=${this.required} @input=${this.onInput} @change=${()=>this.emit("change")}>
				<button slot="trailing" class="cal-btn" type="button" aria-label=${messages.resolve("dj", this.#i18n.locale, "openCalendar") ?? "Open calendar"} @click=${()=>{ this.open=!this.open; }}>
					<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M3 8h18M5 5h14v16H5z" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
				</button>
			</dj-text-input>
			<dj-popup .anchor=${this.field} .open=${this.open} position="below" .scrollLock=${false} @dj-close=${()=>{ this.open=false; }}>
				<dj-calendar .value=${this.value} locale=${this.#i18n.locale} min=${this.min??nothing} max=${this.max??nothing} @change=${(e:Event)=>this.onPick(e)}></dj-calendar>
			</dj-popup>
		`;
	}
}
export default DjDateInput;
