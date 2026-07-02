import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/label";
import "@dojo-ng/helper-text";
import "@dojo-ng/icon";
import styles from "./dj-native-select.styles.js";

export interface MenuOption { value: string; label?: string; disabled?: boolean; }

/**
 * `<dj-native-select>` — a form-associated wrapper over a native `<select>`, driven by an
 * `options` array, composing `<dj-label>`, `<dj-helper-text>`, and a `<dj-icon>` chevron.
 * A blank option is prepended while nothing is selected. Parts: `label`, `control`, `select`, `helper-text`.
 */
export class DjNativeSelect extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("select") private select!: HTMLSelectElement;
	@state() private focused = false;

	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property({ type: Array }) options: MenuOption[] = [];
	@property() label?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "label-hidden", type: Boolean }) labelHidden = false;
	@property() placeholder?: string;
	@property({ type: Number }) size?: number;
	@state() private valid?: boolean;

	constructor() { super(); this.#internals = this.attachInternals(); }

	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }
	override focus(options?: FocusOptions) { this.select?.focus(options); }
	formResetCallback() { this.value = this.getAttribute("value") ?? ""; this.valid = undefined; this.sync(); }

	private sync() {
		this.#internals.setFormValue(this.value || null);
		if (this.required && !this.value) {
			this.#internals.setValidity({ valueMissing: true }, "Please select an option.", this.select);
		} else {
			this.#internals.setValidity({});
		}
	}
	protected override firstUpdated() { this.sync(); }
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("value") || changed.has("disabled")) this.sync();
	}

	private onChange(event: Event) {
		this.value = (event.target as HTMLSelectElement).value;
		this.valid = this.required ? !!this.value : undefined;
		this.sync();
		this.emit("change");
	}

	override render() {
		return html`
			${this.label
				? html`<dj-label part="label" class="label" ?required=${this.required} ?disabled=${this.isDisabled} ?visually-hidden=${this.labelHidden} .valid=${this.valid} @click=${() => this.focus()}>${this.label}</dj-label>`
				: nothing}
			<div part="control" class="wrapper ${this.focused ? "wrapper--focused" : ""} ${this.valid === false ? "wrapper--invalid" : ""}">
				<select
					part="select"
					class="select"
					name=${this.name ?? nothing}
					size=${this.size ?? nothing}
					aria-label=${this.label ?? nothing}
					aria-invalid=${this.valid === false ? "true" : nothing}
					?disabled=${this.isDisabled}
					?required=${this.required}
					@change=${this.onChange}
					@focus=${() => (this.focused = true)}
					@blur=${() => (this.focused = false)}
				>
					${!this.value ? html`<option value="">${this.placeholder ?? ""}</option>` : nothing}
					${this.options.map(
						(o) => html`<option value=${o.value} ?disabled=${!!o.disabled} ?selected=${o.value === this.value}>${o.label ?? o.value}</option>`,
					)}
				</select>
				<span class="arrow" part="arrow">
					<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
				</span>
			</div>
			<dj-helper-text part="helper-text" .text=${this.helperText ?? ""} .valid=${this.valid}></dj-helper-text>
		`;
	}
}
export default DjNativeSelect;
