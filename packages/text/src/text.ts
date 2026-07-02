import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** `<dj-text>` — typographic wrapper. size/weight/uppercase/truncated/inverse. Part: `base`. */
export class DjText extends DojoElement {
	static override version="0.1.0";
	static override styles = css`
		:host{display:inline;} :host([truncated]){display:block;}
		.base{font-family:var(--dj-font-family,inherit);color:var(--dj-color-text,#1f2937);}
		:host([inverse]) .base{color:var(--dj-color-neutral-0,#fff);}
		:host([uppercase]) .base{text-transform:uppercase;letter-spacing:.04em;}
		:host([truncated]) .base{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
		.s-x-small{font-size:.7rem;} .s-small{font-size:var(--dj-font-size-small,.875rem);} .s-medium{font-size:var(--dj-font-size-medium,1rem);}
		.s-large{font-size:var(--dj-font-size-large,1.5rem);} .s-x-large{font-size:2rem;} .s-xx-large{font-size:2.5rem;}
		.w-light{font-weight:300;} .w-normal{font-weight:var(--dj-font-weight-normal,400);} .w-heavy{font-weight:var(--dj-font-weight-bold,700);}
	`;
	@property({reflect:true}) size:"x-small"|"small"|"medium"|"large"|"x-large"|"xx-large"="medium";
	@property() weight:"light"|"normal"|"heavy"="normal";
	@property({type:Boolean,reflect:true}) inverse=false;
	@property({type:Boolean,reflect:true}) truncated=false;
	@property({type:Boolean,reflect:true}) uppercase=false;
	override render(){ return html`<span part="base" class="base s-${this.size} w-${this.weight}"><slot></slot></span>`; }
}
export default DjText;
