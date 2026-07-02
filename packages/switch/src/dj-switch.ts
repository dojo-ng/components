import { html, nothing } from "lit";
import { property, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import styles from "./dj-switch.styles.js";

/**
 * `<dj-switch>` — a form-associated on/off toggle (role="switch") composing `<dj-label>`.
 * Modeled like a checkbox; the checked flag is `checked` (the Dojo widget called it
 * `value` — renamed here for consistency with checkbox/radio). Parts: `control`, `label`.
 */
export class DjSwitch extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("input") private native!: HTMLInputElement;

	@property({ type: Boolean, reflect: true }) checked = false;
	@property() value = "on";
	@property({ reflect: true }) name?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) readonly = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;

	constructor() { super(); this.#internals = this.attachInternals(); }

	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }

	override focus(options?: FocusOptions) { this.native?.focus(options); }
	formResetCallback() { this.checked = this.hasAttribute("checked"); this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { this.checked = state != null; }

	private sync() { this.#internals.setFormValue(this.checked ? this.value : null); }
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("checked") || changed.has("value")) this.sync();
	}

	private onChange() {
		if (this.readonly) { this.native.checked = this.checked; return; }
		this.checked = this.native.checked;
		this.sync();
		this.emit("change");
	}

	override render() {
		return html`
			<div class="root">
				<input
					class="native"
					type="checkbox"
					role="switch"
					.checked=${this.checked}
					aria-checked=${this.checked ? "true" : "false"}
					name=${this.name ?? nothing}
					?disabled=${this.isDisabled}
					@change=${this.onChange}
				/>
				<span part="control" class="track" @click=${() => this.native?.click()}><span class="thumb"></span></span>
				<dj-label part="label" class="label" secondary ?disabled=${this.isDisabled}
					?visually-hidden=${this.labelHidden}
					@click=${() => this.native?.click()}><slot></slot></dj-label>
			</div>
		`;
	}
}
export default DjSwitch;
