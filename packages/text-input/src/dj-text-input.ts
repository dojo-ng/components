import { html, nothing } from "lit";
import type { CSSResultGroup } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import "@dojo-ng/helper-text";
import styles from "./dj-text-input.styles.js";

export type TextInputType = "text" | "email" | "number" | "password" | "search" | "tel" | "url" | "date";

/**
 * `<dj-text-input>` — a form-associated text field that composes `<dj-label>` and
 * `<dj-helper-text>`. It participates in native forms via ElementInternals: it sets its
 * form value and mirrors the inner input's constraint validity to the host.
 *
 * Slots: `leading`, `trailing`. Parts: `label`, `control`, `input`, `helper-text`.
 * Events: native `input` (composed, crosses the shadow boundary) and a re-dispatched
 * `change`.
 */
export class DjTextInput extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles: CSSResultGroup = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("input") private input!: HTMLInputElement;
	@state() private focused = false;
	@state() private dirty = false;

	@property() value = "";
	@property() type: TextInputType = "text";
	@property({ reflect: true }) name?: string;
	@property() placeholder?: string;
	@property() label?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) readonly = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;
	@property() autocomplete?: string;
	@property() pattern?: string;
	@property() min?: string;
	@property() max?: string;
	@property() step?: string;
	@property({ attribute: "minlength", type: Number }) minlength?: number;
	@property({ attribute: "maxlength", type: Number }) maxlength?: number;
	/** Tri-state validity used for styling/help text; managed by the component. */
	@state() private valid?: boolean;

	constructor() {
		super();
		this.#internals = this.attachInternals();
	}

	get validity(): ValidityState { return this.#internals.validity; }
	get validationMessage(): string { return this.#internals.validationMessage; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }
	setCustomValidity(message: string) {
		this.input.setCustomValidity(message);
		this.syncValidity();
	}

	override focus(options?: FocusOptions) { this.input?.focus(options); }
	override blur() { this.input?.blur(); }

	formResetCallback() {
		this.value = this.getAttribute("value") ?? "";
		this.dirty = false;
		this.valid = undefined;
		this.syncValidity();
	}

	private syncValidity() {
		const input = this.input;
		if (!input) return;
		input.setCustomValidity(this.customValidate(this.value));
		const v = input.validity;
		this.#internals.setFormValue(this.value);
		this.#internals.setValidity(
			{
				valueMissing: v.valueMissing,
				typeMismatch: v.typeMismatch,
				patternMismatch: v.patternMismatch,
				tooLong: v.tooLong,
				tooShort: v.tooShort,
				rangeUnderflow: v.rangeUnderflow,
				rangeOverflow: v.rangeOverflow,
				stepMismatch: v.stepMismatch,
				badInput: v.badInput,
				customError: v.customError,
			},
			v.valid ? "" : input.validationMessage,
			input,
		);
		this.valid = this.dirty ? v.valid : undefined;
	}

	protected override firstUpdated() { this.syncValidity(); }
	protected override updated(changed: Map<PropertyKey, unknown>) { if (changed.has("value")) this.syncValidity(); }

	private onInput(event: Event) {
		this.value = (event.target as HTMLInputElement).value;
		this.dirty = true;
		this.syncValidity();
		// The native input event is composed and crosses the shadow boundary on its own.
	}
	private onChange() {
		this.syncValidity();
		this.emit("change");
	}

	/** Override to add custom validation; return an error message, or "" when valid. */
	protected customValidate(_value: string): string { return ""; }

	/** Overridable affix renderers so variants (e.g. password) can inject controls. */
	protected renderLeading() { return html`<span class="affix"><slot name="leading"></slot></span>`; }
	protected renderTrailing() { return html`<span class="affix"><slot name="trailing"></slot></span>`; }

	override render() {
		const helper = (this.valid === false && this.validationMessage) || this.helperText;
		return html`
			${this.label
				? html`<dj-label
						part="label"
						class="label"
						?required=${this.required}
						?disabled=${this.isDisabled}
						?visually-hidden=${this.labelHidden}
						.valid=${this.valid}
						@click=${() => this.focus()}
						>${this.label}</dj-label
					>`
				: nothing}
			<div
				part="control"
				class="control ${this.focused ? "control--focused" : ""} ${this.valid === false ? "control--invalid" : ""}"
			>
				${this.renderLeading()}
				<input
					part="input"
					class="input"
					.value=${this.value}
					type=${this.type}
					name=${this.name ?? nothing}
					placeholder=${this.placeholder ?? nothing}
					autocomplete=${(this.autocomplete as AutoFill) ?? nothing}
					pattern=${this.pattern ?? nothing}
					min=${this.min ?? nothing}
					max=${this.max ?? nothing}
					step=${this.step ?? nothing}
					minlength=${this.minlength ?? nothing}
					maxlength=${this.maxlength ?? nothing}
					aria-label=${this.label ?? nothing}
					aria-invalid=${this.valid === false ? "true" : nothing}
					?disabled=${this.isDisabled}
					?readonly=${this.readonly}
					?required=${this.required}
					@input=${this.onInput}
					@change=${this.onChange}
					@focus=${() => (this.focused = true)}
					@blur=${() => { this.focused = false; this.dirty = true; this.syncValidity(); }}
				/>
				${this.renderTrailing()}
			</div>
			<dj-helper-text part="helper-text" .text=${helper ?? ""} .valid=${this.valid}></dj-helper-text>
		`;
	}
}
export default DjTextInput;
