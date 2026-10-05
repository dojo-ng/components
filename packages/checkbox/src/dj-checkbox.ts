import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import styles from "./dj-checkbox.styles.js";

/**
 * `<dj-checkbox>` — a form-associated checkbox composing `<dj-label>`. Submits `value`
 * (default "on") when checked, nothing when not. Mirrors required-validity to the host.
 * Parts: `control` (the box), `label`. Event: re-dispatched `change`.
 */
export class DjCheckbox extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.1";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("input") private native!: HTMLInputElement;

	@property({ type: Boolean, reflect: true }) checked = false;
	/**
	 * The checked state from the markup, which a form reset returns to (a native checkbox's
	 * `defaultChecked`). `checked` reflects to the attribute, so the attribute cannot be read
	 * at reset time; it is captured on first connect instead.
	 */
	#defaultChecked = false;
	#defaultCaptured = false;
	override connectedCallback() {
		super.connectedCallback();
		if (!this.#defaultCaptured) {
			this.#defaultCaptured = true;
			this.#defaultChecked = this.hasAttribute("checked");
		}
	}
	@property() value = "on";
	@property({ reflect: true }) name?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) readonly = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;
	@state() private valid?: boolean;

	constructor() { super(); this.#internals = this.attachInternals(); }

	get validity(): ValidityState { return this.#internals.validity; }
	get validationMessage(): string { return this.#internals.validationMessage; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }

	override focus(options?: FocusOptions) { this.native?.focus(options); }

	formResetCallback() { this.checked = this.#defaultChecked; this.valid = undefined; this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { this.checked = state != null; }

	private sync() {
		this.#internals.setFormValue(this.checked ? this.value : null);
		if (this.required && !this.checked) {
			// The native checkbox inside has `required` too, so its message is the browser's own, in
			// the browser's language, like the text inputs'.
			this.#internals.setValidity({ valueMissing: true }, this.native?.validationMessage || "Please check this box.", this.native);
		} else {
			this.#internals.setValidity({});
		}
	}
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("checked") || changed.has("value") || changed.has("required")) this.sync();
	}

	private onChange() {
		if (this.readonly) { this.native.checked = this.checked; return; }
		this.checked = this.native.checked;
		this.valid = this.required ? this.checked : undefined;
		this.sync();
		this.emit("change");
	}

	override render() {
		return html`
			<div class="root ${this.valid === false ? "root--invalid" : ""}">
				<input
					class="native"
					type="checkbox"
					.checked=${this.checked}
					name=${this.name ?? nothing}
					?disabled=${this.isDisabled}
					?required=${this.required}
					aria-invalid=${this.valid === false ? "true" : nothing}
					aria-label=${this.textContent?.trim() || nothing}
					@change=${this.onChange}
				/>
				<span part="control" class="box" @click=${() => this.native?.click()}>
					<svg class="check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
				</span>
				<dj-label
					part="label"
					class="label"
					secondary
					?disabled=${this.isDisabled}
					?required=${this.required}
					?visually-hidden=${this.labelHidden}
					.valid=${this.valid}
					@click=${() => this.native?.click()}
				><slot></slot></dj-label>
			</div>
		`;
	}
}
export default DjCheckbox;
