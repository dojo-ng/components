import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, dismissOnFocusOut, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/label";
import "@dojo-ng/helper-text";
import "@dojo-ng/icon";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import type { ListOption } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-select.styles.js";

registerDefaults("dj", { selectPlaceholder: "Select…" });

/**
 * `<dj-select>` — a form-associated single-select combobox. A trigger shows the selected
 * option; clicking (or ArrowDown/Enter/Space) opens a `<dj-popup>` containing a `<dj-list>`
 * of `options`. Selecting sets `value`, closes, and returns focus. ARIA combobox/listbox.
 * Composes label, helper-text, icon, popup, list. Parts: `label`, `trigger`, `helper-text`.
 */
export class DjSelect extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query(".trigger") private trigger!: HTMLElement;

	@property({ type: Array }) options: ListOption[] = [];
	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property() placeholder?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ reflect: true }) position: PopupPosition = "below";
	@property({ type: Boolean, reflect: true }) open = false;
	@state() private valid?: boolean;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }
	formResetCallback() { this.value = ""; this.valid = undefined; this.sync(); }
	override focus(o?: FocusOptions) { this.trigger?.focus(o); }

	#disposeFocusOut?: () => void;
	override connectedCallback() { super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { if (this.open) this.close(); }); }
	override disconnectedCallback() { super.disconnectedCallback(); this.#disposeFocusOut?.(); }

	private get selectedLabel() { const o = this.options.find((o) => o.value === this.value); return o ? (o.label ?? o.value) : ""; }
	private sync() {
		this.#internals.setFormValue(this.value || null);
		if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, "Please select an option.", this.trigger);
		else this.#internals.setValidity({});
	}
	protected override firstUpdated() { this.sync(); }
	protected override updated(c: Map<PropertyKey, unknown>) {
		if (c.has("value")) this.sync();
		if (c.has("open") && this.open) {
			void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus());
		}
	}

	private openMenu() { if (!this.isDisabled) this.open = true; }
	private close() { this.open = false; }

	private onSelect(e: Event) {
		e.stopPropagation();
		const list = e.target as HTMLElement & { value: string };
		this.value = list.value;
		this.valid = this.required ? !!this.value : undefined;
		this.open = false;
		this.sync();
		this.emit("change");
		this.trigger?.focus();
	}

	private onTriggerKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); this.openMenu(); }
	}

	override render() {
		const width = this.trigger ? `${this.trigger.offsetWidth}px` : "auto";
		return html`
			${this.label ? html`<dj-label part="label" class="label" ?required=${this.required} ?disabled=${this.isDisabled} .valid=${this.valid} @click=${() => this.focus()}>${this.label}</dj-label>` : nothing}
			<button
				part="trigger" class="trigger ${this.valid === false ? "trigger--invalid" : ""}" type="button"
				role="combobox" aria-haspopup="listbox" aria-expanded=${this.open ? "true" : "false"}
				aria-label=${this.label ?? nothing} ?disabled=${this.isDisabled}
				@click=${() => (this.open ? this.close() : this.openMenu())} @keydown=${this.onTriggerKey}
			>
				<span class=${this.value ? "" : "placeholder"}>${this.value ? this.selectedLabel : (this.placeholder ?? messages.resolve("dj", this.#i18n.locale, "selectPlaceholder") ?? "Select…")}</span>
				<span class="arrow"><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></span>
			</button>
			<dj-popup .anchor=${this.trigger} .open=${this.open} position=${this.position} @dj-close=${() => this.close()} .scrollLock=${false}>
				<dj-list style=${`width:${width}`} .options=${this.options} .value=${this.value} @change=${(e: Event) => this.onSelect(e)}></dj-list>
			</dj-popup>
			<dj-helper-text part="helper-text" .text=${this.helperText ?? ""} .valid=${this.valid}></dj-helper-text>
		`;
	}
}
export default DjSelect;
