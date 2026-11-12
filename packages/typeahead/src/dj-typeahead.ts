import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import DojoElement, { DojoFormControl, dismissOnFocusOut, FormControl, defaultTrueBoolean } from "@dojo-ng/dojo-element";
import "@dojo-ng/text-input";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import "@dojo-ng/loading-indicator";
import { RemoteOptions } from "@dojo-ng/list";
import type { ListOption, SetOptionsInit } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-typeahead.styles.js";

/** Lowercased labels per options array, computed once so typing does not lowercase 10,000 labels. */
const keyCache = new WeakMap<ListOption[], string[]>();
function searchKeys(options: ListOption[]): string[] {
	let keys = keyCache.get(options);
	if (!keys) { keys = options.map((o) => (o.label ?? o.value).toLowerCase()); keyCache.set(options, keys); }
	return keys;
}

registerDefaults("dj", { selectAnOption: "Please select an option.", suggestions: "Suggestions", selectLoading: "Loading options", selectResults: "{count} options" });
const EN: Record<string, string> = { selectAnOption: "Please select an option.", suggestions: "Suggestions", selectLoading: "Loading options", selectResults: "{count} options" };

/**
 * `<dj-typeahead>` — an editable combobox: type to filter `options`, pick from a popup
 * `<dj-list>`. `strict` (default true) requires the value to match an option. Composes
 * text-input, popup, list. Form-associated. Event: `change`.
 *
 * #### Long lists
 * - The popup list is virtual above 200 options, and filtering 10,000 options keeps up with typing.
 * - The popup opens with the selected option in view.
 *
 * #### Options from a server: `remote`
 * - With `remote`, the typeahead does not filter `options` itself. Typing emits
 *   `dj-options-request` (detail `{ query, offset, epoch }`) after `request-delay` ms (default 200)
 *   without a keystroke, and scrolling near the end of the list asks for the next page with
 *   `offset` set to the number of options loaded.
 * - Answer with `setOptions(options, { epoch, total, append })`, passing back the request's
 *   `epoch`. An answer with an older epoch is dropped and `setOptions` returns false, so a slow
 *   answer to an earlier query never replaces a newer one. You never need to cancel a request.
 * - `selectedOptions` holds `{ value, label }` for a selected value whose option is not loaded,
 *   so the field shows its label. The typeahead adds to it when the user chooses.
 * - While a request is out the list shows a spinner and announces "Loading options".
 */
export class DjTypeahead extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.5";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query("dj-text-input") private field!: HTMLElement & { value: string; focus(): void };

	@property({ type: Array }) options: ListOption[] = [];
	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property() placeholder?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ type: Boolean, converter: defaultTrueBoolean }) strict = true;
	@property({ reflect: true }) position: PopupPosition = "below";
	/** Options come from the app through `dj-options-request` and `setOptions`. */
	@property({ type: Boolean, reflect: true }) remote = false;
	/** With `remote`, ms without a keystroke before a request is sent. */
	@property({ type: Number, attribute: "request-delay" }) requestDelay = 200;
	/** Labels for a selected value whose option is not loaded: `{ value, label }` objects. */
	@property({ type: Array, attribute: "selected-options" }) selectedOptions: ListOption[] = [];
	@state() private open = false;
	#remote = new RemoteOptions(this);
	@state() private query = "";
	#reopenGuard = false;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	override focus(o?: FocusOptions) { this.field?.focus(o); }
	formResetCallback() { this.value = this.defaultValue; this.query = ""; this.sync(); }

	#disposeFocusOut?: () => void;
	override connectedCallback() { super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; }); }
	override disconnectedCallback() { super.disconnectedCallback(); this.#disposeFocusOut?.(); this.#remote.dispose(); }

	/** The current request epoch (remote mode). */
	get epoch(): number { return this.#remote.epoch; }

	/** Remote mode: answer a `dj-options-request`. Returns false, and changes nothing, when `epoch`
	 *  is not the current one. */
	setOptions(options: ListOption[], init: SetOptionsInit): boolean {
		const next = this.#remote.accept(options, init);
		if (!next) return false;
		this.options = next;
		this.requestUpdate();
		return true;
	}

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN[key].replace(/\{(\w+)\}/g, (_, k: string) => String(params?.[k] ?? ""));
	}

	#openPopup() {
		this.open = true;
		if (this.remote && !this.options.length && !this.#remote.loading) this.#remote.request(this.query.trim(), true);
	}

	private sync() {
		this.#internals.setFormValue(this.value || null);
		if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, messages.resolve("dj", this.#i18n.locale, "selectAnOption") ?? "Please select an option.", this.field);
		else this.#internals.setValidity({});
	}
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("value") || changed.has("required")) this.sync();
	}

	#filterMemo?: { options: ListOption[]; q: string; result: ListOption[] };
	/** Options matching the typed text. Memoized on (options, query) so a render does not refilter,
	 *  and the list gets the same array back until something changed. */
	private get filtered(): ListOption[] {
		const q = this.query.trim().toLowerCase();
		const m = this.#filterMemo;
		if (this.remote) return this.options;
		if (m && m.options === this.options && m.q === q) return m.result;
		const keys = searchKeys(this.options);
		const result = q ? this.options.filter((_, i) => keys[i].includes(q)) : this.options;
		this.#filterMemo = { options: this.options, q, result };
		return result;
	}
	private labelFor(value: string) {
		const o = this.options.find((o) => o.value === value) ?? this.selectedOptions.find((o) => o.value === value);
		return o ? (o.label ?? o.value) : value;
	}

	private onInput(e: Event) {
		this.query = (e.target as HTMLInputElement).value;
		this.open = true;
		if (this.remote) this.#remote.request(this.query.trim());
		if (!this.strict) { this.value = this.query; this.sync(); }
	}
	private onSelect(e: Event) {
		e.stopPropagation();
		const list = e.target as HTMLElement & { value: string };
		this.value = list.value;
		const chosen = this.options.find((o) => o.value === this.value);
		if (this.remote && chosen && !this.selectedOptions.some((o) => o.value === chosen.value)) this.selectedOptions = [...this.selectedOptions, { value: chosen.value, label: chosen.label }];
		this.query = this.labelFor(this.value);
		this.open = false;
		this.sync();
		this.emit("change");
		this.#reopenGuard = true;
		this.field?.focus();
	}
	private onFieldKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown") { e.preventDefault(); this.#openPopup(); void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus()); }
		else if (e.key === "Escape") { this.open = false; }
	}

	override render() {
		const display = this.query || (this.value ? this.labelFor(this.value) : "");
		const loading = this.remote && this.#remote.loading;
		const firstLoad = loading && !this.options.length;
		const shown = this.open && (this.filtered.length > 0 || firstLoad);
		const status = this.remote && this.open ? (loading ? this.#msg("selectLoading") : this.#msg("selectResults", { count: this.#remote.total ?? this.options.length })) : "";
		return html`
			<dj-text-input
				.value=${display}
				label=${this.label ?? nothing}
				placeholder=${this.placeholder ?? nothing}
				helper-text=${this.helperText ?? nothing}
				?disabled=${this.isDisabled} ?required=${this.required}
				role="combobox" aria-expanded=${this.open ? "true" : "false"} aria-controls="suggestions"
				@input=${this.onInput} @keydown=${this.onFieldKey} @focus=${() => { if (this.#reopenGuard) { this.#reopenGuard = false; return; } if (this.options.length || this.remote) this.#openPopup(); }}
			></dj-text-input>
			<dj-popup .anchor=${this.field} .open=${shown} position=${this.position} .scrollLock=${false} @dj-close=${() => { this.open = false; }}>
				<div class="panel">
					<dj-list id="suggestions" label=${this.#msg("suggestions")} .options=${this.filtered} .value=${this.value} .loading=${firstLoad}
						@change=${(e: Event) => this.onSelect(e)} @dj-scroll-end=${() => { if (this.remote) this.#remote.more(); }}></dj-list>
					${loading && !firstLoad ? html`<div class="more-loading"><dj-loading-indicator type="circular-small" label=${this.#msg("selectLoading")}></dj-loading-indicator></div>` : nothing}
				</div>
			</dj-popup>
			<div class="status" role="status">${status}</div>
		`;
	}
}
export default DjTypeahead;
