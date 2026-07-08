import { html, nothing, type TemplateResult } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { DragZoneController, keyboardGrabMode, type DragZoneConfig, type GrabMessages } from "@dojo-ng/dnd";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import "@dojo-ng/loading-indicator";
import styles from "./dj-list.styles.js";

export interface ListOption { value: string; label: string; disabled?: boolean; divider?: boolean; }

export interface ReorderDetail { key: string; fromIndex: number; toIndex: number; }

registerDefaults("dj", {
	listReorderGrabbed: "Grabbed {label}. Use the arrow keys to move, space to drop, escape to cancel.",
	listReorderMoved: "{label} moved to position {pos}.",
	listReorderDropped: "{label} dropped.",
	listReorderCancelled: "Cancelled moving {label}.",
});
const EN_REORDER: Record<string, string> = {
	listReorderGrabbed: "Grabbed {label}. Use the arrow keys to move, space to drop, escape to cancel.",
	listReorderMoved: "{label} moved to position {pos}.",
	listReorderDropped: "{label} dropped.",
	listReorderCancelled: "Cancelled moving {label}.",
};

/**
 * `<dj-list>` — a single-select list/menu driven by `options`. Uses the active-descendant
 * pattern (one tab stop; arrow/Home/End move the active item, Enter/Space selects). `menu`
 * switches roles to menu/menuitem. Form-associated (submits `value`). Shows a spinner when
 * `loading`. With `reorderable`, items can be dragged (pointer/touch) or moved by keyboard
 * (space to grab, arrows to move, space to drop, escape to cancel) — controlled: it emits
 * `dj-reorder` and the consumer reorders `options`. Virtualization is deferred. Parts: `list`, `item`.
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
	/** Accessible name for the list/menu container (sets `aria-label` on the listbox/menu,
	 *  which otherwise has no accessible name). Mirrors dj-text-input's `label` approach. */
	@property() label?: string;
	@property({ type: Boolean }) menu = false;
	@property({ type: Boolean }) loading = false;
	/** Progressive enhancement: allow pointer/keyboard reordering of items. Controlled — the
	 *  list emits `dj-reorder` and never mutates `options` itself. */
	@property({ type: Boolean, reflect: true }) reorderable = false;
	@state() private activeIndex = -1;
	/** The value of the item currently "picked up" by the keyboard grab, for visual feedback. */
	@state() private grabbedKey: string | null = null;
	/** Target drop position (among reorderable items) during a keyboard grab; null when idle. */
	@state() private grabIndex: number | null = null;

	#i18n = new LocaleController(this);
	#zone?: DragZoneController;
	#zoneCfg?: DragZoneConfig;
	#grab?: (e: KeyboardEvent) => void;

	constructor() { super(); this.#internals = this.attachInternals(); }
	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN_REORDER[key] ?? key;
	}
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	formResetCallback() { this.value = ""; this.sync(); }
	private sync() { this.#internals.setFormValue(this.value || null); }
	override focus(options?: FocusOptions) { this.listEl?.focus(options); }
	protected override firstUpdated() { this.sync(); }
	protected override updated(c: Map<PropertyKey, unknown>) { if (c.has("value")) this.sync(); this.#syncReorder(); }

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

	// ------------------------------------------------- public active-item API (caret-anchored menus)
	// Drive the active (highlighted) option from outside the list — used by the rich-text mention and
	// slash menus, which keep DOM focus in the editor and steer this list programmatically. Built on
	// the same private selectable-walk as the keyboard handler; `activeIndex` stays private.

	/** Move the highlighted (active) option by one selectable step, wrapping; skips disabled items and dividers. */
	moveActive(delta: 1 | -1): void { this.move(delta === 1); }

	/** Highlight the first selectable option (skipping disabled items and dividers); clears the highlight if none. */
	activateFirst(): void { this.activeIndex = this.selectable()[0]?.i ?? -1; }

	/** Select the active option, firing the normal `change`. Returns false and fires nothing if none is active. */
	chooseActive(): boolean {
		const opt = this.activeIndex >= 0 ? this.options[this.activeIndex] : undefined;
		if (!opt || opt.disabled || opt.divider) return false;
		this.select(this.activeIndex);
		return true;
	}

	private onKeyDown(e: KeyboardEvent) {
		// When reorderable, route everything but Enter through grab mode first (Enter stays
		// "select"; Space grabs/drops, arrows move a grabbed item, Escape cancels). If grab mode
		// acted (preventDefault), don't also navigate/select.
		if (this.reorderable && this.#grab && e.key !== "Enter") {
			this.#grab(e);
			if (e.defaultPrevented) return;
		}
		switch (e.key) {
			case "ArrowDown": e.preventDefault(); this.move(true); break;
			case "ArrowUp": e.preventDefault(); this.move(false); break;
			case "Home": e.preventDefault(); this.activeIndex = this.selectable()[0]?.i ?? -1; break;
			case "End": { e.preventDefault(); const s = this.selectable(); this.activeIndex = s[s.length - 1]?.i ?? -1; break; }
			case "Enter": case " ": if (this.activeIndex >= 0) { e.preventDefault(); this.select(this.activeIndex); } break;
		}
	}

	// ------------------------------------------------------------------ reorder (progressive)

	/** The non-divider option elements, in order — the draggable/reorderable items. */
	#reorderItems(): HTMLElement[] {
		return this.listEl ? [...this.listEl.querySelectorAll<HTMLElement>('li[part="item"]')] : [];
	}

	#labelFor(key: string): string {
		return this.opts.find((o) => o.value === key)?.label ?? key;
	}

	#announceReorder(msg: string) {
		const region = this.renderRoot?.querySelector(".announce");
		if (region) region.textContent = msg;
	}

	#grabMessages(): GrabMessages {
		return {
			grabbed: (key) => this.#msg("listReorderGrabbed", { label: this.#labelFor(key) }),
			moved: (key, _zone, position) => this.#msg("listReorderMoved", { label: this.#labelFor(key), pos: position }),
			dropped: (key) => this.#msg("listReorderDropped", { label: this.#labelFor(key) }),
			cancelled: (key) => this.#msg("listReorderCancelled", { label: this.#labelFor(key) }),
		};
	}

	#emitReorder(m: { key: string; fromIndex: number; toIndex: number }) {
		this.emit("dj-reorder", { detail: { key: m.key, fromIndex: m.fromIndex, toIndex: m.toIndex } });
	}

	/** Attach/detach the single reorder zone + keyboard grab handler as `reorderable` toggles. */
	#syncReorder() {
		if (this.reorderable && !this.#zone) {
			const cfg: DragZoneConfig = {
				container: () => this.listEl,
				items: () => this.#reorderItems(),
				zoneId: "list",
				axis: "y",
				onMove: (m) => this.#emitReorder(m),
			};
			this.#zoneCfg = cfg;
			this.#zone = new DragZoneController(this, cfg);
			this.#grab = keyboardGrabMode({
				zones: () => (this.#zoneCfg ? [this.#zoneCfg] : []),
				announce: (msg) => this.#announceReorder(msg),
				messages: this.#grabMessages(),
				// The list knows its active item (active-descendant), so hand it to grab mode
				// directly rather than relying on cross-shadow focus detection.
				current: () => {
					if (this.activeIndex < 0) return null;
					const index = this.opts.slice(0, this.activeIndex).filter((o) => !o.divider).length;
					return { zoneIndex: 0, index };
				},
				onGrabChange: (s) => { this.grabbedKey = s.grabbed ? s.key : null; this.grabIndex = s.grabbed ? s.index : null; },
			});
		} else if (!this.reorderable && this.#zone) {
			this.#zone.hostDisconnected();
			this.removeController(this.#zone);
			this.#zone = undefined;
			this.#zoneCfg = undefined;
			this.#grab = undefined;
		}
	}

	#renderOption(o: ListOption, i: number): TemplateResult {
		const selected = o.value === this.value;
		const active = i === this.activeIndex;
		const grabbed = this.grabbedKey === o.value;
		return html`<li
			id=${`opt-${i}`} part="item" data-key=${o.value}
			class="item ${active ? "item--active" : ""} ${selected ? "item--selected" : ""} ${o.disabled ? "item--disabled" : ""} ${grabbed ? "item--grabbed" : ""}"
			aria-grabbed=${this.reorderable ? (grabbed ? "true" : "false") : nothing}
			role=${this.menu ? "menuitem" : "option"}
			aria-selected=${this.menu ? nothing : (selected ? "true" : "false")}
			aria-disabled=${o.disabled ? "true" : nothing}
			@click=${() => this.select(i)}
			@pointermove=${() => { if (!o.disabled) this.activeIndex = i; }}
		>
			<dj-icon class="check" size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
			<span class="label">${o.label}</span>
		</li>`;
	}

	/** List rows, weaving a drop indicator at the keyboard grab's target position (feedback for
	 *  the "picked up" item; the pointer path renders its own indicator via @dojo-ng/dnd). */
	#renderRows(): TemplateResult[] {
		const grabbing = this.reorderable && this.grabbedKey != null && this.grabIndex != null;
		const indicator = (): TemplateResult => html`<li class="dj-drop-indicator" part="drop-indicator" aria-hidden="true"></li>`;
		const rows: TemplateResult[] = [];
		let pos = 0; // position among non-grabbed reorderable items
		this.opts.forEach((o, i) => {
			if (o.divider) { rows.push(html`<li role="separator" class="divider"></li>`); return; }
			const isGrabbed = grabbing && o.value === this.grabbedKey;
			if (grabbing && !isGrabbed && pos === this.grabIndex) rows.push(indicator());
			rows.push(this.#renderOption(o, i));
			if (grabbing && !isGrabbed) pos++;
		});
		if (grabbing && (this.grabIndex ?? 0) >= pos) rows.push(indicator());
		return rows;
	}

	override render() {
		if (this.loading) {
			return html`<div part="list" class="list"><div class="loading"><dj-loading-indicator type="circular-small"></dj-loading-indicator></div></div>`;
		}
		const activeId = this.activeIndex >= 0 ? `opt-${this.activeIndex}` : nothing;
		return html`<ul
			part="list" class="list" role=${this.menu ? "menu" : "listbox"}
			aria-label=${this.label ?? nothing}
			tabindex="0" aria-activedescendant=${activeId}
			@keydown=${this.onKeyDown}
		>
			${this.#renderRows()}
			</ul>
		<div class="announce" aria-live="polite"></div>`;
	}
}
export default DjList;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-reorder": CustomEvent<ReorderDetail>;
	}
}
