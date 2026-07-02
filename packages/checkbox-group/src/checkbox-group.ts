import { html, css, nothing } from "lit"; import { property } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/checkbox"; import "@dojo-ng/label";
export interface CheckboxOption { value: string; label?: string; disabled?: boolean; }
/** `<dj-checkbox-group>` — multi-select group from `options`; submits each checked value under `name`. */
export class DjCheckboxGroup extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override version="0.1.0";
	static override focusable = true;
	static formAssociated=true;
	static override styles=css`:host{display:block;} .group{border:0;margin:0;padding:0;} .legend{margin-bottom:var(--dj-spacing-x-small,.5rem);} .items{display:flex;flex-direction:column;gap:var(--dj-spacing-x-small,.5rem);} :host([orientation="horizontal"]) .items{flex-direction:row;flex-wrap:wrap;}`;
	#internals: ElementInternals;
	@property({type:Array}) options: CheckboxOption[] = [];
	@property({type:Array}) value: string[] = [];
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property({reflect:true}) orientation:"vertical"|"horizontal"="vertical";
	@property({type:Boolean,reflect:true}) disabled=false;
	constructor(){ super(); this.#internals=this.attachInternals(); this.addEventListener("change", this.onChange as EventListener); }
	get validity(){ return this.#internals.validity; }
	checkValidity(){ return this.#internals.checkValidity(); }
	formResetCallback(){ this.value=[]; this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { const base = this.name ?? "values"; this.value = state instanceof FormData ? state.getAll(base).map(String) : []; }
	private sync(){ const fd=new FormData(); const base=this.name??"values"; for(const v of this.value) fd.append(base,v); this.#internals.setFormValue(fd); }
	protected override firstUpdated(){ this.sync(); }
	private onChange=(e:Event)=>{ const t=e.target as Element|null; if(!t||t.localName!=="dj-checkbox") return; const cb=t as HTMLElement&{value:string;checked:boolean};
		const set=new Set(this.value); if(cb.checked) set.add(cb.value); else set.delete(cb.value); this.value=[...set]; this.sync(); this.emit("change",{detail:this.value} as CustomEventInit); };
	override render(){
		return html`<fieldset class="group" role="group" aria-labelledby=${this.label?"lg":nothing}>
			${this.label?html`<dj-label id="lg" class="legend" ?disabled=${this.isDisabled}>${this.label}</dj-label>`:nothing}
			<div class="items">${this.options.map(o=>html`<dj-checkbox value=${o.value} ?checked=${this.value.includes(o.value)} ?disabled=${this.isDisabled||!!o.disabled}>${o.label??o.value}</dj-checkbox>`)}</div>
		</fieldset>`;
	}
}
export default DjCheckboxGroup;
