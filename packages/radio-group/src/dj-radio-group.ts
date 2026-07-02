import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import "@dojo-ng/radio";
import type { DjRadio } from "@dojo-ng/radio";
import styles from "./dj-radio-group.styles.js";

export interface RadioOption { value: string; label?: string; disabled?: boolean; }

/**
 * `<dj-radio-group>` — coordinates a set of `<dj-radio>` into a single-choice control.
 * Provide choices either with the `options` array (rendered for you) or by slotting
 * `<dj-radio>` children. The group owns selection (exclusivity), roving-arrow keyboard
 * navigation, and form participation: it is the one form-associated element, submitting
 * the selected `value` under `name`. Child radios should not carry their own `name`.
 *
 * This is local parent-child coordination, so it uses DOM, properties, and events — no
 * external store needed.
 *
 * Parts: `group`, `label`. Event: `change` when the selected value changes.
 */
export class DjRadioGroup extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;

	@property({ reflect: true }) name?: string;
	@property() value = "";
	@property({ type: Array }) options?: RadioOption[];
	@property() label?: string;
	@property({ reflect: true }) orientation: "vertical" | "horizontal" = "vertical";
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@state() private valid?: boolean;

	constructor() {
		super();
		this.#internals = this.attachInternals();
		this.addEventListener("change", this.onChildChange as EventListener);
		this.addEventListener("keydown", this.onKeyDown as EventListener);
	}

	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }
	formResetCallback() { this.value = ""; this.valid = undefined; this.sync(); }

	private radios(): DjRadio[] {
		const root = this.renderRoot as ShadowRoot;
		if (this.options) {
			return Array.from(root.querySelectorAll("dj-radio")) as DjRadio[];
		}
		const slot = root.querySelector("slot");
		if (!slot) return [];
		return slot
			.assignedElements({ flatten: true })
			.filter((el): el is DjRadio => el.localName === "dj-radio");
	}

	// Roving tabindex: the selected radio is the single tab stop; if none selected, the first enabled one.
	#rovingValue(items: { value: string; disabled?: boolean }[]): string {
		if (this.value && items.some((i) => i.value === this.value)) return this.value;
		const firstEnabled = items.find((i) => !i.disabled && !this.isDisabled);
		return firstEnabled ? firstEnabled.value : "";
	}
	private sync() {
		this.#internals.setFormValue(this.value || null);
		if (this.required && !this.value) {
			this.#internals.setValidity({ valueMissing: true }, "Please select an option.", this);
		} else {
			this.#internals.setValidity({});
		}
		// For slotted children, reflect selection imperatively (options path is template-driven).
		if (!this.options) {
			const radios = this.radios();
			const rv = this.#rovingValue(radios.map((r) => ({ value: r.value, disabled: r.disabled })));
			for (const r of radios) {
				r.checked = r.value === this.value;
				r.tabbable = r.value === rv;
				if (this.isDisabled) r.disabled = true;
			}
		}
	}

	protected override firstUpdated() { this.sync(); }
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("value") || changed.has("disabled")) this.sync();
	}

	private onChildChange = (event: Event) => {
		const target = event.target as Element | null;
		if (!target || target.localName !== "dj-radio") return;
		const radio = target as DjRadio;
		if (!radio.checked) return;
		if (this.value !== radio.value) {
			this.value = radio.value;
			this.valid = this.required ? true : undefined;
			this.sync();
			this.emit("change");
		}
	};

	private onKeyDown = (event: KeyboardEvent) => {
		const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
		if (!keys.includes(event.key)) return;
		const enabled = this.radios().filter((r) => !r.disabled);
		if (enabled.length === 0) return;
		event.preventDefault();
		const current = enabled.findIndex((r) => r.value === this.value);
		const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
		const next = current === -1 ? 0 : (current + (forward ? 1 : -1) + enabled.length) % enabled.length;
		const target = enabled[next];
		this.value = target.value;
		this.sync();
		target.focus();
		this.emit("change");
	};

	override render() {
		return html`
			<fieldset
				part="group"
				class="group"
				role="radiogroup"
				aria-labelledby=${this.label ? "legend" : nothing}
				aria-required=${this.required ? "true" : nothing}
			>
				${this.label
					? html`<dj-label id="legend" part="label" class="legend" ?required=${this.required} .valid=${this.valid}>${this.label}</dj-label>`
					: nothing}
				<div class="radios radios--${this.orientation}">
					${this.options
						? (() => { const rv = this.#rovingValue(this.options!); return this.options!.map(
								(o) => html`<dj-radio
									value=${o.value}
									?checked=${o.value === this.value}
									?tabbable=${o.value === rv}
									?disabled=${this.isDisabled || !!o.disabled}
									>${o.label ?? o.value}</dj-radio
								>`,
							); })()
						: html`<slot @slotchange=${() => this.sync()}></slot>`}
				</div>
			</fieldset>
		`;
	}
}
export default DjRadioGroup;
