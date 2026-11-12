import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, dismissOnFocusOut, reducedMotion, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/label";
import "@dojo-ng/helper-text";
import "@dojo-ng/icon";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import "@dojo-ng/loading-indicator";
import { RemoteOptions, listValues, parseListValue } from "@dojo-ng/list";
import type { ListOption, ListValue, SetOptionsInit } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-select.styles.js";

registerDefaults("dj", {
	selectPlaceholder: "Select…",
	selectAnOption: "Please select an option.",
	selectAtLeastOne: "Please select at least one option.",
	selectAll: "Select all",
	selectRemove: "Remove {label}",
	selectMore: "+{count}",
	selectLoading: "Loading options",
	selectResults: "{count} options",
});
const EN: Record<string, string> = {
	selectPlaceholder: "Select…",
	selectAnOption: "Please select an option.",
	selectAtLeastOne: "Please select at least one option.",
	selectAll: "Select all",
	selectRemove: "Remove {label}",
	selectMore: "+{count}",
	selectLoading: "Loading options",
	selectResults: "{count} options",
};

/** The option value of the select-all row. Not a value anyone can choose: it never reaches `value`. */
const ALL = "__dj-select-all__";

/**
 * `<dj-select>` — a form-associated select: a trigger shows the selection, and opening it shows a
 * `<dj-list>` of `options` in a `<dj-popup>`. ARIA combobox and listbox.
 *
 * #### Single selection
 * - Click, ArrowDown, Enter, or Space on the trigger opens the list, with the selected option
 *   active and in view.
 * - Choosing, Escape, and a click outside close it and return focus to the trigger; tabbing away
 *   closes it and leaves focus where it went.
 *
 * #### Multiple selection: `multiple`
 * - `value` is a string array. Choosing toggles an option and the list stays open.
 * - Selected values show as chips in the trigger, each with a remove button. Backspace on the
 *   trigger removes the last one. Chips that do not fit collapse to "+N", and the trigger's
 *   accessible name lists every selected label.
 * - `select-all` adds a "Select all" row at the top.
 * - `required` means at least one value.
 * - The form value has one entry per value under `name`; `dj-form` gives the array under `name`.
 *   In markup, give starting values as JSON: `value='["a","b"]'`.
 * - For free entry of new tags, use `dj-chip-typeahead` instead.
 *
 * #### Long lists
 * - The list is virtual above its threshold (200 options), so thousands of options are fine.
 *
 * #### Options from a server: `remote`
 * - With `remote`, the select emits `dj-options-request` (detail `{ query, offset, epoch }`) when
 *   it first opens with no options, and again with `offset` set to the number loaded when the user
 *   scrolls near the end.
 * - Answer with `setOptions(options, { epoch, total, append })`, passing back the request's
 *   `epoch`. An answer with an older epoch is dropped and `setOptions` returns false.
 *   `append` adds a page after the loaded options; `total`, when known, stops paging there.
 * - `selectedOptions` holds `{ value, label }` for selected values whose option is not loaded, so
 *   the trigger can show their labels. The select adds to it as the user chooses.
 * - While a request is out the list shows a spinner and announces "Loading options".
 *
 * Changing `required` revalidates at once.
 * Composes label, helper-text, icon, popup, list. Parts: `label`, `trigger`, `chip`, `more`,
 * `helper-text`.
 */
export class DjSelect extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = [styles, reducedMotion];
	static override version = "0.2.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query(".trigger") private trigger!: HTMLElement;

	@property({ type: Array }) options: ListOption[] = [];
	/** The selected value; a string array when `multiple` is set. */
	@property({ converter: { fromAttribute: parseListValue, toAttribute: (v: ListValue) => (Array.isArray(v) ? JSON.stringify(v) : v) } }) value: ListValue = "";
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property({ attribute: "helper-text" }) helperText?: string;
	@property() placeholder?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ reflect: true }) position: PopupPosition = "below";
	@property({ type: Boolean, reflect: true }) open = false;
	/** Choose several values; `value` becomes a string array. */
	@property({ type: Boolean, reflect: true }) multiple = false;
	/** With `multiple`, add a "Select all" row at the top of the list. */
	@property({ type: Boolean, attribute: "select-all" }) selectAll = false;
	/** Options come from the app through `dj-options-request` and `setOptions`. */
	@property({ type: Boolean, reflect: true }) remote = false;
	/** Labels for selected values whose option is not loaded: `{ value, label }` objects. */
	@property({ type: Array, attribute: "selected-options" }) selectedOptions: ListOption[] = [];
	@state() private valid?: boolean;
	/** How many chips fit before the "+N" (multiple only). */
	@state() private visibleChips = Infinity;

	#remote = new RemoteOptions(this);
	#chipObserver?: ResizeObserver;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }
	formResetCallback() {
		const d = parseListValue(this.getAttribute("value"));
		this.value = this.multiple ? listValues(d) : (Array.isArray(d) ? (d[0] ?? "") : d);
		this.valid = undefined;
		this.sync();
	}
	override restoreFormState(state: File | string | FormData | null) {
		if (state instanceof FormData) this.value = state.getAll(this.name ?? "value").map(String);
		else if (typeof state === "string") this.value = state;
	}
	override focus(o?: FocusOptions) { this.trigger?.focus(o); }

	/** The selected values as an array, in either mode. */
	get values(): string[] { return listValues(this.value); }

	/** The current request epoch (remote mode). */
	get epoch(): number { return this.#remote.epoch; }

	/**
	 * Remote mode: answer a `dj-options-request`. Returns false, and changes nothing, when `epoch`
	 * is not the current one.
	 */
	setOptions(options: ListOption[], init: SetOptionsInit): boolean {
		const next = this.#remote.accept(options, init);
		if (!next) return false;
		this.options = next;
		this.requestUpdate();
		return true;
	}

	#disposeFocusOut?: () => void;
	override connectedCallback() { super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { if (this.open) this.close(); }); }
	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#disposeFocusOut?.();
		this.#remote.dispose();
		this.#chipObserver?.disconnect();
		this.#chipObserver = undefined;
	}

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN[key].replace(/\{(\w+)\}/g, (_, k: string) => String(params?.[k] ?? ""));
	}

	#labelFor(v: string): string {
		const o = this.options.find((o) => !o.divider && o.value === v) ?? this.selectedOptions.find((o) => o.value === v);
		return o ? (o.label ?? o.value) : v;
	}
	private get selectedLabel() { const v = this.values[0]; return v === undefined ? "" : this.#labelFor(v); }

	private sync() {
		const vals = this.values;
		if (this.multiple) {
			const fd = new FormData();
			for (const v of vals) fd.append(this.name ?? "value", v);
			this.#internals.setFormValue(fd);
		} else {
			this.#internals.setFormValue(vals[0] || null);
		}
		if (this.required && !vals.length) this.#internals.setValidity({ valueMissing: true }, this.#msg(this.multiple ? "selectAtLeastOne" : "selectAnOption"), this.trigger);
		else this.#internals.setValidity({});
	}
	protected override firstUpdated() { this.sync(); }
	protected override willUpdate(c: Map<PropertyKey, unknown>) {
		// Keep `value` in the shape the mode calls for.
		if (c.has("multiple") || c.has("value")) {
			if (this.multiple && !Array.isArray(this.value)) this.value = listValues(this.value);
			else if (!this.multiple && Array.isArray(this.value)) this.value = this.value[0] ?? "";
		}
		if (c.has("value") || c.has("multiple")) this.visibleChips = Infinity;
	}
	protected override updated(c: Map<PropertyKey, unknown>) {
		if (c.has("required") && !this.required && this.valid === false) this.valid = undefined;
		if (c.has("value") || c.has("required") || c.has("multiple") || c.has("name")) this.sync();
		if (c.has("open") && this.open) {
			if (this.remote && !this.options.length && !this.#remote.loading) this.#remote.request("", true);
			void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus());
		}
		if (this.multiple) this.#fitChips();
	}

	private openMenu() { if (!this.isDisabled) this.open = true; }
	private close(refocus = false) {
		if (!this.open) return;
		this.open = false;
		// The list had focus and is about to vanish; without this, focus falls to <body>.
		if (refocus) this.trigger?.focus();
	}

	/** Remember labels of chosen values, so they survive a remote answer that replaces `options`. */
	#rememberLabels(values: string[]) {
		if (!this.remote) return;
		const known = new Set(this.selectedOptions.map((o) => o.value));
		const add = values.filter((v) => !known.has(v)).map((v) => this.options.find((o) => o.value === v)).filter((o): o is ListOption => !!o);
		if (add.length) this.selectedOptions = [...this.selectedOptions, ...add.map((o) => ({ value: o.value, label: o.label }))];
	}

	#setValue(next: ListValue) {
		this.value = next;
		this.#rememberLabels(listValues(next));
		this.valid = this.required ? listValues(next).length > 0 : undefined;
		this.sync();
		this.emit("change");
	}

	private onSelect(e: Event) {
		e.stopPropagation();
		const list = e.target as HTMLElement & { value: ListValue };
		if (!this.multiple) {
			this.#setValue(list.value as string);
			this.open = false;
			this.trigger?.focus();
			return;
		}
		// The list toggled exactly one row; the select-all row selects every option or none.
		const before = new Set(listValues(this.#listValue()));
		const after = listValues(list.value);
		const afterSet = new Set(after);
		if (before.has(ALL) !== afterSet.has(ALL)) {
			this.#setValue(afterSet.has(ALL) ? this.#choosable() : []);
			return;
		}
		this.#setValue(after.filter((v) => v !== ALL));
	}

	/** Values the select-all row can select: every enabled option. */
	#choosable(): string[] { return this.options.filter((o) => !o.divider && !o.disabled).map((o) => o.value); }

	#remove(v: string) {
		if (this.isDisabled) return;
		this.#setValue(this.values.filter((x) => x !== v));
		this.trigger?.focus();
	}

	private onTriggerKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); this.openMenu(); }
		else if (e.key === "Backspace" && this.multiple && this.values.length) { e.preventDefault(); this.#remove(this.values[this.values.length - 1]); }
	}

	/** Hide the chips that do not fit on the trigger's line, leaving room for "+N". */
	#fitChips() {
		const box = this.renderRoot.querySelector<HTMLElement>(".chips");
		if (!box) return;
		if (!this.#chipObserver && typeof ResizeObserver !== "undefined") {
			let width = box.clientWidth;
			this.#chipObserver = new ResizeObserver(() => {
				if (box.clientWidth === width) return;
				width = box.clientWidth;
				this.visibleChips = Infinity;
			});
			this.#chipObserver.observe(box);
		}
		if (this.visibleChips !== Infinity) return;
		const chips = [...box.querySelectorAll<HTMLElement>('[part="chip"]')];
		const width = box.clientWidth;
		if (!width || !chips.length) return;
		const reserve = 48; // room for "+N"
		let fit = chips.length;
		const right = (el: HTMLElement) => el.offsetLeft + el.offsetWidth;
		if (right(chips[chips.length - 1]) > width) {
			fit = 0;
			while (fit < chips.length && right(chips[fit]) <= width - reserve) fit++;
			fit = Math.max(1, fit);
		}
		if (fit !== chips.length) this.visibleChips = fit;
		else this.visibleChips = chips.length;
	}

	#renderChips() {
		const vals = this.values;
		const shown = Math.min(vals.length, this.visibleChips);
		const more = vals.length - shown;
		return html`<span class="chips">${vals.slice(0, shown).map((v) => {
			const label = this.#labelFor(v);
			return html`<span part="chip" class="chip"><span class="chip-label">${label}</span><button
				type="button" class="chip-remove" tabindex="-1" aria-label=${this.#msg("selectRemove", { label })}
				?disabled=${this.isDisabled}
				@click=${(e: Event) => { e.stopPropagation(); this.#remove(v); }}
			><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></span>`;
		})}${more > 0 ? html`<span part="more" class="more">${this.#msg("selectMore", { count: more })}</span>` : nothing}</span>`;
	}

	#listOptions(): ListOption[] {
		if (!this.multiple || !this.selectAll || !this.options.length) return this.options;
		return [{ value: ALL, label: this.#msg("selectAll") }, ...this.options];
	}

	#listValue(): ListValue {
		if (!this.multiple) return this.value;
		const vals = this.values;
		if (!this.selectAll) return vals;
		const all = this.#choosable();
		const set = new Set(vals);
		return all.length && all.every((v) => set.has(v)) ? [ALL, ...vals] : vals;
	}

	override render() {
		const width = this.trigger ? `${this.trigger.offsetWidth}px` : "auto";
		const vals = this.values;
		const placeholder = this.placeholder ?? this.#msg("selectPlaceholder");
		const remoteLoading = this.remote && this.#remote.loading;
		const firstLoad = remoteLoading && !this.options.length;
		const status = this.remote && this.open ? (remoteLoading ? this.#msg("selectLoading") : this.#msg("selectResults", { count: this.#remote.total ?? this.options.length })) : "";
		const list = html`<dj-list id="listbox" style=${`width:${width}`} .options=${this.#listOptions()} .value=${this.#listValue()}
			?multiple=${this.multiple} .loading=${firstLoad} label=${this.label ?? nothing}
			@change=${(e: Event) => this.onSelect(e)} @dj-scroll-end=${() => { if (this.remote) this.#remote.more(); }}></dj-list>`;
		return html`
			${this.label ? html`<dj-label part="label" class="label" ?required=${this.required} ?disabled=${this.isDisabled} .valid=${this.valid} @click=${() => this.focus()}>${this.label}</dj-label>` : nothing}
			${this.multiple ? html`<div
				part="trigger" class="trigger trigger--multiple ${this.valid === false ? "trigger--invalid" : ""} ${this.isDisabled ? "trigger--disabled" : ""}"
				role="combobox" aria-haspopup="listbox" aria-expanded=${this.open ? "true" : "false"} aria-controls="listbox"
				tabindex=${this.isDisabled ? "-1" : "0"} aria-disabled=${this.isDisabled ? "true" : nothing}
				aria-label=${[this.label, vals.length ? vals.map((v) => this.#labelFor(v)).join(", ") : placeholder].filter(Boolean).join(": ")}
				aria-describedby=${this.helperText ? "helper" : nothing}
				aria-invalid=${this.valid === false ? "true" : nothing}
				@click=${() => (this.open ? this.close() : this.openMenu())} @keydown=${this.onTriggerKey}
			>
				${vals.length ? this.#renderChips() : html`<span class="placeholder">${placeholder}</span>`}
				<span class="arrow"><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></span>
			</div>` : html`<button
				part="trigger" class="trigger ${this.valid === false ? "trigger--invalid" : ""}" type="button"
				role="combobox" aria-haspopup="listbox" aria-expanded=${this.open ? "true" : "false"} aria-controls="listbox"
				aria-label=${this.label ?? nothing} aria-describedby=${this.helperText ? "helper" : nothing}
				aria-invalid=${this.valid === false ? "true" : nothing} ?disabled=${this.isDisabled}
				@click=${() => (this.open ? this.close() : this.openMenu())} @keydown=${this.onTriggerKey}
			>
				<span class=${vals.length ? "" : "placeholder"}>${vals.length ? this.selectedLabel : placeholder}</span>
				<span class="arrow"><dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon></span>
			</button>`}
			<dj-popup .anchor=${this.trigger} .open=${this.open} position=${this.position} @dj-close=${() => this.close(true)} .scrollLock=${false}>
				<div class="panel">
					${list}
					${remoteLoading && !firstLoad ? html`<div class="more-loading"><dj-loading-indicator type="circular-small" label=${this.#msg("selectLoading")}></dj-loading-indicator></div>` : nothing}
				</div>
			</dj-popup>
			<div class="status" role="status">${status}</div>
			<dj-helper-text id="helper" part="helper-text" .text=${this.helperText ?? ""} .valid=${this.valid}></dj-helper-text>
		`;
	}
}
export default DjSelect;
