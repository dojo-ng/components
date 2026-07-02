import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, dismissOnFocusOut, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/text-input";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import type { ListOption } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-typeahead.styles.js";

/**
 * `<dj-typeahead>` — an editable combobox: type to filter `options`, pick from a popup
 * `<dj-list>`. `strict` (default true) requires the value to match an option. Composes
 * text-input, popup, list. Form-associated. Event: `change`.
 */
export class DjTypeahead extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query("dj-text-input") private field!: HTMLElement & { value: string; focus(): void };

	@property({ type: Array }) options: ListOption[] = [];
	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property() placeholder?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ type: Boolean }) strict = true;
	@property({ reflect: true }) position: PopupPosition = "below";
	@state() private open = false;
	@state() private query = "";
	#reopenGuard = false;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	override focus(o?: FocusOptions) { this.field?.focus(o); }
	formResetCallback() { this.value = ""; this.query = ""; this.sync(); }

	#disposeFocusOut?: () => void;
	override connectedCallback() { super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; }); }
	override disconnectedCallback() { super.disconnectedCallback(); this.#disposeFocusOut?.(); }

	private sync() {
		this.#internals.setFormValue(this.value || null);
		if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, "Please select an option.", this.field);
		else this.#internals.setValidity({});
	}
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("value") || changed.has("required")) this.sync();
	}

	private get filtered(): ListOption[] {
		const q = this.query.trim().toLowerCase();
		if (!q) return this.options;
		return this.options.filter((o) => (o.label ?? o.value).toLowerCase().includes(q));
	}
	private labelFor(value: string) { const o = this.options.find((o) => o.value === value); return o ? (o.label ?? o.value) : value; }

	private onInput(e: Event) {
		this.query = (e.target as HTMLInputElement).value;
		this.open = true;
		if (!this.strict) { this.value = this.query; this.sync(); }
	}
	private onSelect(e: Event) {
		const list = e.target as HTMLElement & { value: string };
		this.value = list.value;
		this.query = this.labelFor(this.value);
		this.open = false;
		this.sync();
		this.emit("change");
		this.#reopenGuard = true;
		this.field?.focus();
	}
	private onFieldKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown") { e.preventDefault(); this.open = true; void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus()); }
		else if (e.key === "Escape") { this.open = false; }
	}

	override render() {
		const display = this.query || (this.value ? this.labelFor(this.value) : "");
		return html`
			<dj-text-input
				.value=${display}
				label=${this.label ?? nothing}
				placeholder=${this.placeholder ?? nothing}
				helper-text=${this.helperText ?? nothing}
				?disabled=${this.isDisabled} ?required=${this.required}
				role="combobox" aria-expanded=${this.open ? "true" : "false"}
				@input=${this.onInput} @keydown=${this.onFieldKey} @focus=${() => { if (this.#reopenGuard) { this.#reopenGuard = false; return; } if (this.options.length) this.open = true; }}
			></dj-text-input>
			<dj-popup .anchor=${this.field} .open=${this.open && this.filtered.length > 0} position=${this.position} .scrollLock=${false} @dj-close=${() => { this.open = false; }}>
				<dj-list .options=${this.filtered} .value=${this.value} @change=${(e: Event) => this.onSelect(e)}></dj-list>
			</dj-popup>
		`;
	}
}
export default DjTypeahead;
