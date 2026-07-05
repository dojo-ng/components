import { html, nothing } from "lit";
import type { CSSResultGroup } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/slider";
import "@dojo-ng/text-input";
import styles from "./dj-color-picker.styles.js";
import { formatColor, hsvToRgb, parseColor, rgbToHsv, type ColorFormat, type HSV } from "./color.js";

const EN: Record<string, string> = {
	colorArea: "Saturation and brightness",
	hue: "Hue",
	alpha: "Opacity",
	colorValue: "Color value",
};
registerDefaults("dj", EN);

/** A swatch entry: a bare color string, or a color with an explicit accessible label. */
export type Swatch = string | { value: string; label?: string };

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/**
 * `<dj-color-picker>` — an inline color picker with a 2D saturation/brightness area, a hue slider,
 * an optional opacity slider, a text field, and optional swatches. Form-associated: it submits the
 * formatted color string under `name`. There is no built-in trigger or popup — compose `dj-popup`
 * to make it a dropdown.
 *
 * The internal model is HSV + alpha; `value` is a color STRING formatted through `format`
 * (`hex`/`rgb`/`hsl`). Parts: `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`.
 * Event: `dj-change` (`{ value }`) on every user-initiated change, including during a drag.
 *
 * @cssprop [--dj-color-picker-width=240px] - Overall width of the inline panel.
 */
export class DjColorPicker extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles: CSSResultGroup = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	#dragging = false;
	@query(".area") private area!: HTMLElement;
	@query(".value-input") private valueInput!: HTMLInputElement & { value: string };

	/** The picker's model. `value` is derived from this. */
	@state() private hsv: HSV = { h: 0, s: 0, v: 0, a: 1 };

	@property() format: ColorFormat = "hex";
	@property({ type: Boolean, reflect: true }) alpha = false;
	@property({ attribute: false }) swatches: Swatch[] = [];
	@property() label?: string;
	@property({ reflect: true }) name?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;

	@property()
	get value(): string {
		return formatColor(hsvToRgb(this.hsv), this.format, this.alpha);
	}
	set value(v: string) {
		const rgb = parseColor(v);
		if (!rgb) return; // unparseable: keep the current color (revert)
		const old = formatColor(hsvToRgb(this.hsv), this.format, this.alpha);
		this.hsv = rgbToHsv(rgb);
		this.requestUpdate("value", old);
	}

	constructor() {
		super();
		this.#internals = this.attachInternals();
	}

	get validity(): ValidityState { return this.#internals.validity; }
	get validationMessage(): string { return this.#internals.validationMessage; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }

	formResetCallback() {
		const attr = this.getAttribute("value") ?? "#000000";
		const rgb = parseColor(attr) ?? parseColor("#000000")!;
		this.hsv = rgbToHsv(rgb);
	}

	protected override firstUpdated() { this.#syncForm(); }
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("hsv") || changed.has("format") || changed.has("alpha") || changed.has("name")) {
			this.#syncForm();
		}
	}

	#syncForm() { this.#internals.setFormValue(this.name ? this.value : null); }
	#msg(key: string): string { return messages.resolve("dj", this.#i18n.locale, key) ?? EN[key] ?? key; }

	/** Merge into the model and emit `dj-change`. Called by every user interaction. */
	#change(partial: Partial<HSV>) {
		this.hsv = { ...this.hsv, ...partial };
		this.emit("dj-change", { detail: { value: this.value } });
	}

	// --- 2D area (pointer geometry is browser-only; see P7) ---
	#applyPointer(e: PointerEvent) {
		const rect = this.area.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const s = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
		const v = clamp((1 - (e.clientY - rect.top) / rect.height) * 100, 0, 100);
		this.#change({ s, v });
	}
	#onAreaDown = (e: PointerEvent) => {
		if (this.isDisabled) return;
		this.#dragging = true;
		this.area.setPointerCapture(e.pointerId);
		this.#applyPointer(e);
	};
	#onAreaMove = (e: PointerEvent) => { if (this.#dragging) this.#applyPointer(e); };
	#onAreaUp = (e: PointerEvent) => {
		this.#dragging = false;
		try { this.area.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
	};
	#onThumbKey = (e: KeyboardEvent) => {
		if (this.isDisabled) return;
		const step = e.shiftKey ? 10 : 1;
		let handled = true;
		if (e.key === "ArrowLeft") this.#change({ s: clamp(this.hsv.s - step, 0, 100) });
		else if (e.key === "ArrowRight") this.#change({ s: clamp(this.hsv.s + step, 0, 100) });
		else if (e.key === "ArrowUp") this.#change({ v: clamp(this.hsv.v + step, 0, 100) });
		else if (e.key === "ArrowDown") this.#change({ v: clamp(this.hsv.v - step, 0, 100) });
		else handled = false;
		if (handled) e.preventDefault();
	};

	// --- sliders / text / swatches ---
	#onHue = (e: Event) => { this.#change({ h: Number((e.target as HTMLInputElement).value) }); };
	#onAlpha = (e: Event) => { this.#change({ a: Number((e.target as HTMLInputElement).value) / 100 }); };
	#onText = (e: Event) => {
		const entry = (e.target as HTMLInputElement).value;
		if (parseColor(entry)) {
			this.value = entry;
			this.emit("dj-change", { detail: { value: this.value } });
		} else {
			// Unparseable: revert the field to the current value silently.
			if (this.valueInput) this.valueInput.value = this.value;
		}
	};
	#onSwatch = (raw: string) => {
		if (this.isDisabled || !parseColor(raw)) return;
		this.value = raw;
		this.emit("dj-change", { detail: { value: this.value } });
	};

	override render() {
		const disabled = this.isDisabled;
		const areaBg = `hsl(${this.hsv.h}, 100%, 50%)`;
		return html`
			<div class="picker" part="picker">
				${this.label ? html`<span class="label" part="label">${this.label}</span>` : nothing}
				<div
					class="area"
					part="area"
					style="background-color: ${areaBg}"
					@pointerdown=${this.#onAreaDown}
					@pointermove=${this.#onAreaMove}
					@pointerup=${this.#onAreaUp}
				>
					<div
						class="thumb"
						part="thumb"
						role="slider"
						tabindex=${disabled ? -1 : 0}
						aria-label=${this.#msg("colorArea")}
						aria-valuetext=${this.value}
						aria-disabled=${disabled ? "true" : nothing}
						style="left: ${this.hsv.s}%; top: ${100 - this.hsv.v}%"
						@keydown=${this.#onThumbKey}
					></div>
				</div>
				<div class="sliders">
					<dj-slider
						part="hue"
						class="hue"
						label=${this.#msg("hue")}
						label-hidden
						min="0"
						max="360"
						step="1"
						.showOutput=${false}
						.value=${this.hsv.h}
						?disabled=${disabled}
						@input=${this.#onHue}
						@change=${this.#onHue}
					></dj-slider>
					${this.alpha
						? html`<dj-slider
								part="alpha"
								class="alpha"
								label=${this.#msg("alpha")}
								label-hidden
								min="0"
								max="100"
								step="1"
								.showOutput=${false}
								.value=${Math.round(this.hsv.a * 100)}
								?disabled=${disabled}
								@input=${this.#onAlpha}
								@change=${this.#onAlpha}
							></dj-slider>`
						: nothing}
				</div>
				<dj-text-input
					part="input"
					class="value-input"
					label=${this.#msg("colorValue")}
					label-hidden
					.value=${this.value}
					?disabled=${disabled}
					@change=${this.#onText}
				></dj-text-input>
				${this.swatches.length
					? html`<div class="swatches" part="swatches">
							${this.swatches.map((s) => {
								const value = typeof s === "string" ? s : s.value;
								const label = typeof s === "string" ? s : (s.label ?? s.value);
								return html`<button
									type="button"
									class="swatch"
									part="swatch"
									aria-label=${label}
									style="background-color: ${value}"
									?disabled=${disabled}
									@click=${() => this.#onSwatch(value)}
								></button>`;
							})}
						</div>`
					: nothing}
			</div>
		`;
	}
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-change": CustomEvent<{ value: string }>;
	}
}

export default DjColorPicker;
