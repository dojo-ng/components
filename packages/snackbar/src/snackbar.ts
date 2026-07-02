import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-snackbar>` — a toast. `open` shows it; `type` success/error tints; slots: default (message), `actions`.
 *
 * @cssprop [--dj-snackbar-z-index=960] - Stacking order of the snackbar. */
export class DjSnackbar extends DojoElement {
	static override version="0.1.0";
	static override styles = css`
		:host{display:none;position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:var(--dj-snackbar-z-index,960);}
		:host([open]){display:block;}
		.bar{display:flex;align-items:center;gap:var(--dj-spacing-medium,1rem);min-width:18rem;max-width:90vw;
			padding:var(--dj-spacing-x-small,.5rem) var(--dj-spacing-medium,1rem);border-radius:var(--dj-input-border-radius-medium,.25rem);
			background:var(--dj-color-neutral-800,#1f2937);color:var(--dj-color-neutral-0,#fff);box-shadow:0 4px 16px rgb(0 0 0 / .3);}
		:host([leading]) .bar{justify-content:flex-start;} :host([stacked]) .bar{flex-direction:column;align-items:stretch;}
		:host([type="success"]) .bar{background:var(--dj-color-success-600,#16a34a);}
		:host([type="error"]) .bar{background:var(--dj-color-danger-600,#dc2626);}
		.msg{flex:1 1 auto;} .actions{display:flex;gap:var(--dj-spacing-x-small,.5rem);}
		/* Forced colors: the dark/status fills and shadow collapse; border the bar so it stays
		   a distinct surface. Status type is conveyed by text/icon, not background alone. */
		@media (forced-colors: active){ .bar{border:1px solid CanvasText;} }
	`;
	@property({type:Boolean,reflect:true}) open=false;
	@property({reflect:true}) type?:"success"|"error";
	@property({type:Boolean,reflect:true}) leading=false;
	@property({type:Boolean,reflect:true}) stacked=false;
	override render(){ return html`<div class="bar" role="status" aria-live="polite"><span class="msg"><slot></slot></span><span class="actions"><slot name="actions"></slot></span></div>`; }
}
export default DjSnackbar;
