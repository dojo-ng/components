import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import styles from "./dj-radio.styles.js";

/**
 * `<dj-radio>` — a form-associated radio composing `<dj-label>`. Radios sharing a `name`
 * within the same form (or document) are mutually exclusive: checking one unchecks the
 * others. Submits `value` when checked. Parts: `control`, `label`. Event: `change`.
 */
export class DjRadio extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("input") private native!: HTMLInputElement;

	@property({ type: Boolean, reflect: true }) checked = false;
	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;
	/** Whether this radio is in the tab order. The group sets this for roving tabindex. */
	@property({ type: Boolean }) tabbable = true;
	@state() private valid?: boolean;

	constructor() { super(); this.#internals = this.attachInternals(); }

	get validity(): ValidityState { return this.#internals.validity; }
	get validationMessage(): string { return this.#internals.validationMessage; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }

	override focus(options?: FocusOptions) { this.native?.focus(options); }
	formResetCallback() { this.checked = this.hasAttribute("checked"); this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { this.checked = state != null; }

	private group(): DjRadio[] {
		if (!this.name) return [this];
		const scope = this.#internals.form ?? this.getRootNode() as Document | ShadowRoot;
		return Array.from(scope.querySelectorAll<DjRadio>("dj-radio")).filter((r) => r.name === this.name);
	}
	private sync() { this.#internals.setFormValue(this.checked ? this.value : null); }
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("checked") || changed.has("value")) this.sync();
	}

	private onChange() {
		this.checked = this.native.checked;
		if (this.checked) {
			for (const r of this.group()) if (r !== this) r.checked = false;
		}
		this.sync();
		this.emit("change");
	}

	override render() {
		return html`
			<div class="root">
				<input
					class="native"
					type="radio"
					tabindex=${this.tabbable ? "0" : "-1"} aria-label=${this.textContent?.trim() || nothing}
					.checked=${this.checked}
					name=${this.name ?? nothing}
					?disabled=${this.isDisabled}
					?required=${this.required}
					@change=${this.onChange}
				/>
				<span part="control" class="circle" @click=${() => this.native?.click()}><span class="dot"></span></span>
				<dj-label part="label" class="label" secondary ?disabled=${this.isDisabled}
					?visually-hidden=${this.labelHidden} .valid=${this.valid}
					@click=${() => this.native?.click()}><slot></slot></dj-label>
			</div>
		`;
	}
}
export default DjRadio;
