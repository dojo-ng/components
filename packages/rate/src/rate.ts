import { html, css } from "lit"; import { property } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element"; import "@dojo-ng/icon";
/** `<dj-rate>` — star rating (0..max). Form-associated. (Half-step `allowHalf` accepted; full-star core.) */
export class DjRate extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override version="0.1.0";
	static override focusable = true;
	static formAssociated=true;
	static override styles=css`
		:host{display:inline-flex;} .stars{display:inline-flex;gap:.1rem;} 
		.star{border:none;background:transparent;cursor:pointer;padding:0;color:var(--dj-color-neutral-300,#d1d5db);width:1.5rem;height:1.5rem;}
		.star--on{color:var(--dj-color-warning-500,#eab308);} :host([readonly]) .star{cursor:default;}
		.star:focus-visible{outline:var(--dj-focus-ring,2px solid currentColor);outline-offset:2px;}
	`;
	#internals: ElementInternals;
	@property({type:Number}) max=5;
	@property({type:Number}) value=0;
	@property({type:Boolean}) allowHalf=false;
	@property({type:Boolean,reflect:true}) readonly=false;
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	constructor(){ super(); this.#internals=this.attachInternals(); }
	get validity(){ return this.#internals.validity; }
	checkValidity(){ return this.#internals.checkValidity(); }
	formResetCallback(){ this.value=0; this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { this.value = state == null ? 0 : Number(state); }
	private sync(){ this.#internals.setFormValue(String(this.value)); }
	protected override firstUpdated(){ this.sync(); }
	protected override updated(c:Map<PropertyKey,unknown>){ if(c.has("value")) this.sync(); }
	private set(n:number){ if(this.readonly) return; this.value=this.value===n?0:n; this.sync(); this.emit("change"); }
	override render(){
		return html`<span class="stars" role="group" aria-label=${this.label ?? "Rating"}>
			${Array.from({length:this.max},(_,i)=>i+1).map(n=>html`<button type="button" class="star ${n<=this.value?"star--on":""}" aria-label=${`${n} of ${this.max}`} aria-pressed=${n<=this.value?"true":"false"} @click=${()=>this.set(n)} ?disabled=${this.readonly}>
				<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.5 7 .7-5.2 4.7L18 21l-6-3.5L6 21l1.2-7.1L2 9.2l7-.7z" fill="currentColor"/></svg></dj-icon></button>`)}
		</span>`;
	}
}
export default DjRate;
