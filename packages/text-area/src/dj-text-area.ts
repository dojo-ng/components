import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import "@dojo-ng/helper-text";
import styles from "./dj-text-area.styles.js";

/**
 * `<dj-text-area>` — a form-associated multi-line text field, composing `<dj-label>` and
 * `<dj-helper-text>`. Same form/validity model as `<dj-text-input>`.
 * Parts: `label`, `control`, `input`, `helper-text`. Events: native `input` + re-dispatched `change`.
 */
export class DjTextArea extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("textarea") private input!: HTMLTextAreaElement;
	@state() private focused = false;
	@state() private dirty = false;

	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property() placeholder?: string;
	@property() label?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property({ type: Number }) rows = 3;
	@property({ type: Number }) cols?: number;
	@property() wrap?: "hard" | "soft" | "off";
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) readonly = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;
	@property({ attribute: "minlength", type: Number }) minlength?: number;
	@property({ attribute: "maxlength", type: Number }) maxlength?: number;
	@state() private valid?: boolean;

	constructor() { super(); this.#internals = this.attachInternals(); }

	get validity(): ValidityState { return this.#internals.validity; }
	get validationMessage(): string { return this.#internals.validationMessage; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }
	setCustomValidity(message: string) { this.input.setCustomValidity(message); this.syncValidity(); }
	override focus(options?: FocusOptions) { this.input?.focus(options); }
	override blur() { this.input?.blur(); }
	formResetCallback() { this.value = this.getAttribute("value") ?? ""; this.dirty = false; this.valid = undefined; this.syncValidity(); }

	private syncValidity() {
		const input = this.input;
		if (!input) return;
		const v = input.validity;
		this.#internals.setFormValue(this.value);
		this.#internals.setValidity(
			{ valueMissing: v.valueMissing, tooLong: v.tooLong, tooShort: v.tooShort, customError: v.customError },
			v.valid ? "" : input.validationMessage,
			input,
		);
		this.valid = this.dirty ? v.valid : undefined;
	}
	protected override firstUpdated() { this.syncValidity(); }
	protected override updated(changed: Map<PropertyKey, unknown>) { if (changed.has("value")) this.syncValidity(); }

	private onInput(event: Event) {
		this.value = (event.target as HTMLTextAreaElement).value;
		this.dirty = true;
		this.syncValidity();
	}
	private onChange() { this.syncValidity(); this.emit("change"); }

	override render() {
		const helper = (this.valid === false && this.validationMessage) || this.helperText;
		return html`
			${this.label
				? html`<dj-label part="label" class="label" ?required=${this.required} ?disabled=${this.isDisabled} ?visually-hidden=${this.labelHidden} .valid=${this.valid} @click=${() => this.focus()}>${this.label}</dj-label>`
				: nothing}
			<div part="control" class="control ${this.focused ? "control--focused" : ""} ${this.valid === false ? "control--invalid" : ""}">
				<textarea
					part="input"
					class="input"
					.value=${this.value}
					name=${this.name ?? nothing}
					placeholder=${this.placeholder ?? nothing}
					rows=${this.rows}
					cols=${this.cols ?? nothing}
					wrap=${this.wrap ?? nothing}
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
				></textarea>
			</div>
			<dj-helper-text part="helper-text" .text=${helper ?? ""} .valid=${this.valid}></dj-helper-text>
		`;
	}
}
export default DjTextArea;
