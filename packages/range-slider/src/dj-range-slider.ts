import { html, nothing } from "lit";
import { property, queryAll } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, formatNumber, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/label";
import styles from "./dj-range-slider.styles.js";

registerDefaults("dj", { rangeLabel: "Range" });

export interface RangeValue { min: number; max: number; }

/**
 * `<dj-range-slider>` — a form-associated dual-thumb range. Two overlaid native ranges
 * keep `valueMin <= valueMax`. Submits two form entries (`<name>_min`, `<name>_max`).
 * `value` getter returns `{ min, max }`. Composes `<dj-label>`. Event: `change` (detail `{min,max}`).
 */
export class DjRangeSlider extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@queryAll("input") private inputs!: NodeListOf<HTMLInputElement>;

	@property({ type: Number }) min = 0;
	@property({ type: Number }) max = 100;
	@property({ type: Number }) step = 1;
	@property({ attribute: "value-min", type: Number }) valueMin = 0;
	@property({ attribute: "value-max", type: Number }) valueMax = 100;
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property({ attribute: "show-output", type: Boolean }) showOutput = false;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get value(): RangeValue { return { min: this.valueMin, max: this.valueMax }; }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	formResetCallback() { this.valueMin = this.min; this.valueMax = this.max; this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { if (!(state instanceof FormData)) return; const base = this.name ?? "range"; const lo = state.get(base + "_min"); const hi = state.get(base + "_max"); if (lo != null) this.valueMin = Number(lo); if (hi != null) this.valueMax = Number(hi); }

	private sync() {
		const fd = new FormData();
		const base = this.name ?? "range";
		fd.append(`${base}_min`, String(this.valueMin));
		fd.append(`${base}_max`, String(this.valueMax));
		this.#internals.setFormValue(fd);
	}
	protected override firstUpdated() { this.sync(); }
	protected override updated(c: Map<PropertyKey, unknown>) { if (c.has("valueMin") || c.has("valueMax")) this.sync(); }

	private onInput(e: Event, isMin: boolean) {
		const v = parseFloat((e.target as HTMLInputElement).value);
		if (isMin) this.valueMin = Math.min(v, this.valueMax);
		else this.valueMax = Math.max(v, this.valueMin);
		this.sync();
		this.emit("change", { detail: this.value } as CustomEventInit);
	}

	/**
	 * WCAG 2.5.7 single-pointer alternative to dragging a thumb: a press on the track (not on a
	 * thumb) jumps the nearer thumb to that position. Thumb presses fall through to native drag.
	 */
	private onTrackPointerDown(e: PointerEvent) {
		if (this.isDisabled) return;
		if ((e.target as HTMLElement).classList.contains("input")) return; // a thumb — let native drag handle it
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		if (rect.width === 0) return;
		let frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		if (this.#i18n.dir === "rtl") frac = 1 - frac; // inline-start is the right edge in RTL
		const stepped = Math.round((this.min + frac * (this.max - this.min)) / this.step) * this.step;
		const val = Math.min(this.max, Math.max(this.min, stepped));
		if (Math.abs(val - this.valueMin) <= Math.abs(val - this.valueMax)) this.valueMin = Math.min(val, this.valueMax);
		else this.valueMax = Math.max(val, this.valueMin);
		this.sync();
		this.emit("change", { detail: this.value } as CustomEventInit);
	}

	override render() {
		const span = this.max - this.min;
		const lo = ((this.valueMin - this.min) / span) * 100;
		const hi = ((this.valueMax - this.min) / span) * 100;
		return html`
			${this.label ? html`<dj-label part="label" class="label" secondary ?disabled=${this.isDisabled} ?visually-hidden=${this.labelHidden}>${this.label}</dj-label>` : nothing}
			<div class="wrapper">
				<div class="track-area" @pointerdown=${(e: PointerEvent) => this.onTrackPointerDown(e)}>
					<div part="track" class="track"></div>
					<div part="fill" class="fill" style=${`inset-inline-start:${lo}%;width:${hi - lo}%`}></div>
					<input class="input" type="range" min=${this.min} max=${this.max} step=${this.step} .value=${String(this.valueMin)}
						aria-label=${`${this.label ?? messages.resolve("dj", this.#i18n.locale, "rangeLabel") ?? "Range"} minimum`} ?disabled=${this.isDisabled} @input=${(e: Event) => this.onInput(e, true)} @change=${() => this.emit("change", { detail: this.value } as CustomEventInit)} />
					<input class="input" type="range" min=${this.min} max=${this.max} step=${this.step} .value=${String(this.valueMax)}
						aria-label=${`${this.label ?? messages.resolve("dj", this.#i18n.locale, "rangeLabel") ?? "Range"} maximum`} ?disabled=${this.isDisabled} @input=${(e: Event) => this.onInput(e, false)} @change=${() => this.emit("change", { detail: this.value } as CustomEventInit)} />
				</div>
				${this.showOutput ? html`<span part="output" class="output">${formatNumber(this.valueMin, this.#i18n.locale)}–${formatNumber(this.valueMax, this.#i18n.locale)}</span>` : nothing}
			</div>
		`;
	}
}
export default DjRangeSlider;
