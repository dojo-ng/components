import { html, css, nothing } from "lit"; import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, dismissOnFocusOut, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, dateTimeFormat } from "@dojo-ng/i18n";
import "@dojo-ng/text-input"; import "@dojo-ng/list"; import "@dojo-ng/popup"; import "@dojo-ng/icon";

const toMin = (t: string) => { const [h,m] = t.split(":").map(Number); return (h||0)*60+(m||0); };
const pad = (n: number) => String(n).padStart(2,"0");

/**
 * `<dj-time-picker>` — a `HH:MM` time field with a popup list of options generated from
 * `min`/`max`/`step` (seconds). `format` 24|12 controls option labels. Form-associated.
 */
export class DjTimePicker extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override version="0.1.0";
	static override focusable = true;
	static formAssociated=true;
	static override styles=css`:host{display:block;}`;
	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query("dj-text-input") private field!: HTMLElement & { value: string; focus(): void };
	@property() value=""; @property({ reflect: true }) name?: string; @property() label?: string;
	@property() min="00:00"; @property() max="23:59"; @property({type:Number}) step=1800;
	@property() format:"24"|"12"="24";
	@property({type:Boolean,reflect:true}) disabled=false; @property({type:Boolean,reflect:true}) required=false;
	@state() private open=false;
	#reopenGuard=false;
	constructor(){ super(); this.#internals=this.attachInternals(); }
	get validity(){ return this.#internals.validity; }
	checkValidity(){ return this.#internals.checkValidity(); }
	formResetCallback(){ this.value=""; this.sync(); }
	#disposeFocusOut?: () => void;
	override connectedCallback(){ super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; }); }
	override disconnectedCallback(){ super.disconnectedCallback(); this.#disposeFocusOut?.(); }
	private sync(){ this.#internals.setFormValue(this.value||null); if(this.required&&!this.value) this.#internals.setValidity({valueMissing:true},"Please choose a time.",this.field); else this.#internals.setValidity({}); }
	protected override firstUpdated(){ this.sync(); }
	protected override updated(c:Map<PropertyKey,unknown>){ if(c.has("value")) this.sync(); }
	private fmt(mins:number){ const d=new Date(2000,0,1,Math.floor(mins/60),mins%60);
		return dateTimeFormat(this.#i18n.locale, { hour: this.format==="12"?"numeric":"2-digit", minute:"2-digit", hour12: this.format==="12" }).format(d); }
	private get options(){ const start=toMin(this.min), end=toMin(this.max), st=Math.max(1,Math.round(this.step/60)); const out=[]; for(let t=start;t<=end;t+=st) out.push({value:`${pad(Math.floor(t/60))}:${pad(t%60)}`, label:this.fmt(t)}); return out; }
	private onInput(e:Event){ this.value=(e.target as HTMLInputElement).value; this.open=true; this.sync(); }
	private onPick(e:Event){ this.value=(e.target as HTMLElement&{value:string}).value; this.open=false; this.sync(); this.emit("change"); this.#reopenGuard=true; this.field?.focus(); }
	override render(){
		return html`
			<dj-text-input .value=${this.value} label=${this.label??nothing} placeholder=${this.format==="12"?"hh:mm AM":"HH:MM"} ?disabled=${this.isDisabled} ?required=${this.required} @input=${this.onInput} @focus=${()=>{ if(this.#reopenGuard){ this.#reopenGuard=false; return; } this.open=true; }}>
				<dj-icon slot="trailing"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
			</dj-text-input>
			<dj-popup .anchor=${this.field} .open=${this.open} position="below" .scrollLock=${false} @dj-close=${()=>{ this.open=false; }}>
				<dj-list style="--dj-list-max-height:14rem" .options=${this.options} .value=${this.value} @change=${(e:Event)=>this.onPick(e)}></dj-list>
			</dj-popup>
		`;
	}
}
export default DjTimePicker;
