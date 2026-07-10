import { html, nothing } from "lit";
import { property, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, formatNumber } from "@dojo-ng/i18n";
import "@dojo-ng/label";
import styles from "./dj-slider.styles.js";

/**
 * `<dj-slider>` — a form-associated single-value range input with a themed track/fill/thumb
 * and optional output, composing `<dj-label>`. Parts: `label`, `track`, `fill`, `input`, `output`.
 */
export class DjSlider extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query("input") private input!: HTMLInputElement;

	@property({ type: Number }) min = 0;
	@property({ type: Number }) max = 100;
	@property({ type: Number }) step = 1;
	@property({ type: Number }) value = 0;
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property({ attribute: "show-output", type: Boolean }) showOutput = true;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) readonly = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	override focus(o?: FocusOptions) { this.input?.focus(o); }
	formResetCallback() { this.value = Number(this.getAttribute("value") ?? this.min); this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { this.value = state == null ? 0 : Number(state); }

	private clamp(v: number) { return Math.min(this.max, Math.max(this.min, v)); }
	private sync() { this.#internals.setFormValue(String(this.value)); }
	protected override firstUpdated() { this.value = this.clamp(this.value); this.sync(); }
	protected override updated(c: Map<PropertyKey, unknown>) { if (c.has("value")) this.sync(); }

	private onInput(e: Event) {
		if (this.readonly) { (e.target as HTMLInputElement).value = String(this.value); return; }
		this.value = parseFloat((e.target as HTMLInputElement).value);
		this.sync();
	}

	override render() {
		const pct = ((this.clamp(this.value) - this.min) / (this.max - this.min)) * 100;
		return html`
			${this.label ? html`<dj-label part="label" class="label" secondary ?disabled=${this.isDisabled} ?required=${this.required} ?visually-hidden=${this.labelHidden}>${this.label}</dj-label>` : nothing}
			<div class="wrapper">
				<div class="track-area">
					<div part="track" class="track"></div>
					<div part="fill" class="fill" style=${`width:${pct}%`}></div>
					<input
						part="input" class="input" type="range"
						min=${this.min} max=${this.max} step=${this.step} .value=${String(this.value)}
						name=${this.name ?? nothing}
						aria-label=${this.label ?? nothing}
						?disabled=${this.isDisabled} ?required=${this.required}
						@input=${this.onInput} @change=${() => this.emit("change")}
					/>
				</div>
				${this.showOutput ? html`<span part="output" class="output">${formatNumber(this.clamp(this.value), this.#i18n.locale)}</span>` : nothing}
			</div>
		`;
	}
}
export default DjSlider;
