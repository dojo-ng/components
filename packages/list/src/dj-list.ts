import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/icon";
import "@dojo-ng/loading-indicator";
import styles from "./dj-list.styles.js";

export interface ListOption { value: string; label: string; disabled?: boolean; divider?: boolean; }

/**
 * `<dj-list>` — a single-select list/menu driven by `options`. Uses the active-descendant
 * pattern (one tab stop; arrow/Home/End move the active item, Enter/Space selects). `menu`
 * switches roles to menu/menuitem. Form-associated (submits `value`). Shows a spinner when
 * `loading`. Virtualization and drag-reorder are deferred. Parts: `list`, `item`.
 *
 * @cssprop [--dj-list-max-height=none] - Maximum height before the list scrolls.
 */
export class DjList extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query(".list") private listEl!: HTMLElement;

	@property({ type: Array }) options: ListOption[] = [];
	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property({ type: Boolean }) menu = false;
	@property({ type: Boolean }) loading = false;
	@state() private activeIndex = -1;

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	formResetCallback() { this.value = ""; this.sync(); }
	private sync() { this.#internals.setFormValue(this.value || null); }
	override focus(options?: FocusOptions) { this.listEl?.focus(options); }
	protected override firstUpdated() { this.sync(); }
	protected override updated(c: Map<PropertyKey, unknown>) { if (c.has("value")) this.sync(); }

	private get opts(): ListOption[] { return Array.isArray(this.options) ? this.options : []; }
	private selectable() { return this.opts.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled && !o.divider); }

	private select(index: number) {
		const opt = this.options[index];
		if (!opt || opt.disabled || opt.divider) return;
		this.value = opt.value;
		this.activeIndex = index;
		this.sync();
		this.emit("change");
	}

	private move(forward: boolean) {
		const sel = this.selectable();
		if (!sel.length) return;
		const pos = sel.findIndex(({ i }) => i === this.activeIndex);
		const next = pos === -1 ? (forward ? 0 : sel.length - 1) : (pos + (forward ? 1 : -1) + sel.length) % sel.length;
		this.activeIndex = sel[next].i;
	}

	private onKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case "ArrowDown": e.preventDefault(); this.move(true); break;
			case "ArrowUp": e.preventDefault(); this.move(false); break;
			case "Home": e.preventDefault(); this.activeIndex = this.selectable()[0]?.i ?? -1; break;
			case "End": { e.preventDefault(); const s = this.selectable(); this.activeIndex = s[s.length - 1]?.i ?? -1; break; }
			case "Enter": case " ": if (this.activeIndex >= 0) { e.preventDefault(); this.select(this.activeIndex); } break;
		}
	}

	override render() {
		if (this.loading) {
			return html`<div part="list" class="list"><div class="loading"><dj-loading-indicator type="circular-small"></dj-loading-indicator></div></div>`;
		}
		const activeId = this.activeIndex >= 0 ? `opt-${this.activeIndex}` : nothing;
		return html`<ul
			part="list" class="list" role=${this.menu ? "menu" : "listbox"}
			tabindex="0" aria-activedescendant=${activeId}
			@keydown=${this.onKeyDown}
		>
			${this.opts.map((o, i) => {
				if (o.divider) return html`<li role="separator" class="divider"></li>`;
				const selected = o.value === this.value;
				const active = i === this.activeIndex;
				return html`<li
					id=${`opt-${i}`} part="item"
					class="item ${active ? "item--active" : ""} ${selected ? "item--selected" : ""} ${o.disabled ? "item--disabled" : ""}"
					role=${this.menu ? "menuitem" : "option"}
					aria-selected=${this.menu ? nothing : (selected ? "true" : "false")}
					aria-disabled=${o.disabled ? "true" : nothing}
					@click=${() => this.select(i)}
					@pointermove=${() => { if (!o.disabled) this.activeIndex = i; }}
				>
					<dj-icon class="check" size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
					<span class="label">${o.label}</span>
				</li>`;
			})}
		</ul>`;
	}
}
export default DjList;
