import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, dismissOnFocusOut, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/chip";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import "@dojo-ng/label";
import type { ListOption, DjList } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-chip-typeahead.styles.js";

/**
 * `<dj-chip-typeahead>` — multi-select typeahead: type to filter `options`, pick from the
 * popup `<dj-list>`, selections render as removable `<dj-chip>`s. Backspace on an empty
 * input removes the last chip. Form-associated (submits each value under `name`). Composes
 * chip, list, popup, label. Event: `change` (detail: selected values).
 *
 * With `allow-new`, Enter on non-empty input text creates a chip from the literal trimmed value
 * (a free-text tag), unless the popup has an active (highlighted) option — that keeps picking.
 * New values respect `duplicates`, clear the input, and join the form value like picked ones.
 * Only Enter commits; comma is left alone (it is a valid character in many locales).
 */
export class DjChipTypeahead extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query(".input") private input!: HTMLInputElement;

	@property({ type: Array }) options: ListOption[] = [];
	@property({ type: Array }) value: string[] = [];
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property() placeholder?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;
	@property({ type: Boolean }) duplicates = false;
	/** Allow Enter to create a chip from free-typed text that matches no option. */
	@property({ type: Boolean, reflect: true, attribute: "allow-new" }) allowNew = false;
	@property({ reflect: true }) position: PopupPosition = "below";
	@state() private open = false;
	@state() private query = "";
	@state() private focused = false;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	override focus(o?: FocusOptions) { this.input?.focus(o); }
	formResetCallback() { this.value = []; this.query = ""; this.sync(); }
	override restoreFormState(state: File | string | FormData | null) { const base = this.name ?? "values"; this.value = state instanceof FormData ? state.getAll(base).map(String) : []; }

	#disposeFocusOut?: () => void;
	override connectedCallback() { super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; }); }
	override disconnectedCallback() { super.disconnectedCallback(); this.#disposeFocusOut?.(); }

	private sync() {
		const fd = new FormData();
		const base = this.name ?? "values";
		for (const v of this.value) fd.append(base, v);
		this.#internals.setFormValue(fd);
	}
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("value") || changed.has("name")) this.sync();
	}

	private labelFor(v: string) { const o = this.options.find((o) => o.value === v); return o ? (o.label ?? o.value) : v; }
	private get available(): ListOption[] {
		const q = this.query.trim().toLowerCase();
		return this.options.filter((o) => {
			if (!this.duplicates && this.value.includes(o.value)) return false;
			return !q || (o.label ?? o.value).toLowerCase().includes(q);
		});
	}

	private add(v: string) {
		if (!this.duplicates && this.value.includes(v)) return;
		this.value = [...this.value, v];
		this.query = ""; this.input.value = "";
		this.sync(); this.emit("change", { detail: this.value } as CustomEventInit);
	}
	private removeValue(v: string) {
		const i = this.value.indexOf(v);
		if (i === -1) return;
		this.value = this.value.filter((_, j) => j !== i);
		this.sync(); this.emit("change", { detail: this.value } as CustomEventInit);
	}

	private onInput(e: Event) { this.query = (e.target as HTMLInputElement).value; this.open = true; }
	private onKey(e: KeyboardEvent) {
		if (e.key === "Backspace" && this.query === "" && this.value.length) { this.removeValue(this.value[this.value.length - 1]); }
		else if (e.key === "ArrowDown") { e.preventDefault(); this.open = true; void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus()); }
		else if (e.key === "Enter" && this.allowNew) {
			const text = this.query.trim();
			if (!text) return;
			// A highlighted popup option keeps its pick behavior; otherwise create a literal chip.
			const list = this.renderRoot.querySelector<DjList>("dj-list");
			if (list?.chooseActive()) { e.preventDefault(); return; }
			e.preventDefault();
			this.add(text);
		}
		else if (e.key === "Escape") { this.open = false; }
	}
	private onSelect(e: Event) { e.stopPropagation(); this.add((e.target as HTMLElement & { value: string }).value); this.input?.focus(); }

	override render() {
		return html`
			${this.label ? html`<dj-label part="label" class="label" ?disabled=${this.isDisabled}>${this.label}</dj-label>` : nothing}
			<div part="box" class="box ${this.focused ? "box--focused" : ""}" @click=${() => this.input?.focus()}>
				${this.value.map((v) => html`<dj-chip closeable @dj-close=${() => this.removeValue(v)}>${this.labelFor(v)}</dj-chip>`)}
				<input class="input" .value=${this.query} placeholder=${this.value.length ? nothing : (this.placeholder ?? nothing)}
					?disabled=${this.isDisabled} role="combobox" aria-label=${this.label ?? nothing} aria-expanded=${this.open ? "true" : "false"}
					@input=${this.onInput} @keydown=${this.onKey}
					@focus=${() => { this.focused = true; if (this.available.length) this.open = true; }}
					@blur=${() => { this.focused = false; }} />
			</div>
			<dj-popup .anchor=${this.input} .open=${this.open && this.available.length > 0} position=${this.position} .scrollLock=${false} @dj-close=${() => { this.open = false; }}>
				<dj-list .options=${this.available} @change=${(e: Event) => this.onSelect(e)}></dj-list>
			</dj-popup>
		`;
	}
}
export default DjChipTypeahead;
