import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-snackbar>` — a toast. `open` shows it; `type` success/error tints; slots: default (message), `actions`.
 *
 * Announcements: the snackbar keeps two empty live regions in the accessibility tree at all times,
 * hidden or not, and copies the message text into one when it opens. `type="error"` uses the
 * assertive region (`role="alert"`); every other type uses the polite one (`role="status"`).
 * Changing the message while open announces the new text. The visible message is hidden from
 * assistive tech so it is not read twice; the `actions` slot stays reachable.
 *
 * @cssprop [--dj-snackbar-z-index=960] - Stacking order of the snackbar. */
export class DjSnackbar extends DojoElement {
	static override version="0.1.3";
	static override styles = css`
		:host{position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:var(--dj-snackbar-z-index,960);}
		/* Closed: the bar is not rendered, but the host stays in the tree so its live regions do. */
		:host(:not([open])) .bar{display:none;}
		.bar{display:flex;align-items:center;gap:var(--dj-spacing-medium,1rem);min-width:18rem;max-width:90vw;
			padding:var(--dj-spacing-x-small,.5rem) var(--dj-spacing-medium,1rem);border-radius:var(--dj-input-border-radius-medium,.25rem);
			background:var(--dj-color-neutral-800,#1f2937);color:var(--dj-color-neutral-0,#fff);box-shadow:0 4px 16px rgb(0 0 0 / .3);}
		:host([leading]) .bar{justify-content:flex-start;} :host([stacked]) .bar{flex-direction:column;align-items:stretch;}
		/* success-700 with white text is 5.0:1 (success-600 was 3.3:1); white is fixed so the dark
		   theme's dark neutral-0 does not land on the green. */
		:host([type="success"]) .bar{background:var(--dj-color-success-700,#15803d);color:#fff;}
		:host([type="error"]) .bar{background:var(--dj-color-danger-600,#dc2626);}
		.msg{flex:1 1 auto;} .actions{display:flex;gap:var(--dj-spacing-x-small,.5rem);}
		.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}
		/* Forced colors: the dark/status fills and shadow collapse; border the bar so it stays
		   a distinct surface. Status type is conveyed by text/icon, not background alone. */
		@media (forced-colors: active){ .bar{border:1px solid CanvasText;} }
	`;
	@property({type:Boolean,reflect:true}) open=false;
	@property({reflect:true}) type?:"success"|"error";
	@property({type:Boolean,reflect:true}) leading=false;
	@property({type:Boolean,reflect:true}) stacked=false;

	#announced = "";
	#timer?: ReturnType<typeof setTimeout>;

	override disconnectedCallback(){ super.disconnectedCallback(); clearTimeout(this.#timer); }

	#messageText(){
		const slot=this.renderRoot?.querySelector<HTMLSlotElement>(".msg slot");
		return (slot?.assignedNodes({flatten:true}).map((n)=>n.textContent??"").join("")??"").replace(/\s+/g," ").trim();
	}

	/** Copy the message into the live region that matches `type`, and empty the other. */
	#announce=()=>{
		const polite=this.renderRoot?.querySelector<HTMLElement>(".sr-status");
		const assertive=this.renderRoot?.querySelector<HTMLElement>(".sr-alert");
		if(!polite||!assertive) return;
		const text=this.open?this.#messageText():"";
		const target=this.type==="error"?assertive:polite;
		const other=target===polite?assertive:polite;
		other.textContent="";
		if(text===this.#announced&&target.textContent===text) return;
		this.#announced=text;
		// Clear, then write on the next task: a live region only speaks on a change it sees
		// after it exists, and some screen readers skip a same-tick clear+write.
		target.textContent="";
		clearTimeout(this.#timer);
		if(text) this.#timer=setTimeout(()=>{ if(this.open) target.textContent=text; },50);
	};

	protected override updated(changed:Map<PropertyKey,unknown>){
		if(changed.has("open")||changed.has("type")) this.#announce();
	}

	override render(){ return html`<div class="sr sr-status" role="status" aria-live="polite" aria-atomic="true"></div><div class="sr sr-alert" role="alert" aria-live="assertive" aria-atomic="true"></div><div class="bar"><span class="msg" aria-hidden="true"><slot @slotchange=${this.#announce}></slot></span><span class="actions"><slot name="actions"></slot></span></div>`; }
}
export default DjSnackbar;
