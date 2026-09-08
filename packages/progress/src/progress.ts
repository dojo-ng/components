import { html, css, nothing } from "lit"; import { property } from "lit/decorators.js"; import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, formatNumber } from "@dojo-ng/i18n";
/** `<dj-progress>` — determinate progress bar. value within min..max; `show-output` shows percent. Part: `bar`.
 *
 * @cssprop [--dj-progress-height=8px] - Thickness of the progress bar. */
export class DjProgress extends DojoElement {
	static override version="0.1.1";
	#i18n = new LocaleController(this);
	static override styles = [css`
		:host{display:block;} .track{height:var(--dj-progress-height,8px);background:var(--dj-color-neutral-200,#e5e7eb);border-radius:9999px;overflow:hidden;}
		.bar{height:100%;background:var(--dj-color-primary-600,#2563eb);border-radius:9999px;transition:width var(--dj-transition-fast,150ms);}
		.row{display:flex;align-items:center;gap:var(--dj-spacing-x-small,.5rem);} .track{flex:1 1 auto;} .out{font-variant-numeric:tabular-nums;color:var(--dj-color-text-muted,#6b7280);min-width:3ch;text-align:end;}
		/* Forced colors: track/bar fills collapse; border the track and pin the bar to Highlight. */
		@media (forced-colors: active){ .track{border:1px solid CanvasText;} .bar{background:Highlight;} }
	`, reducedMotion];
	@property({type:Number}) min=0;
	@property({type:Number}) max=100;
	@property({type:Number}) value=0;
	@property({attribute:"show-output",type:Boolean}) showOutput=false;
	@property() label?: string;
	override render(){
		const pct=Math.max(0,Math.min(100,((this.value-this.min)/(this.max-this.min))*100));
		return html`<div class="row"><div class="track" role="progressbar" aria-label=${this.label ?? nothing} aria-valuemin=${this.min} aria-valuemax=${this.max} aria-valuenow=${this.value}><div part="bar" class="bar" style=${`width:${pct}%`}></div></div>${this.showOutput?html`<span class="out">${formatNumber(Math.round(pct)/100, this.#i18n.locale, {style:"percent"})}</span>`:nothing}</div>`;
	}
}
export default DjProgress;
