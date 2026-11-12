import { html, nothing, type TemplateResult } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { DragZoneController, keyboardGrabMode, type DragZoneConfig, type GrabMessages } from "@dojo-ng/dnd";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";
import "@dojo-ng/icon";
import "@dojo-ng/loading-indicator";
import styles from "./dj-list.styles.js";

export interface ListOption { value: string; label: string; disabled?: boolean; divider?: boolean; }

export interface ReorderDetail { key: string; fromIndex: number; toIndex: number; }

/** A list or select value: one string, or a string array when `multiple` is set. */
export type ListValue = string | string[];

/** Reads a `value` attribute: a JSON array (`value='["a","b"]'`) becomes an array, anything else
 *  stays the string it is. */
export function parseListValue(attr: string | null): ListValue {
	if (attr == null) return "";
	if (attr.trimStart().startsWith("[")) {
		try { const v: unknown = JSON.parse(attr); if (Array.isArray(v)) return v.map(String); } catch { /* not JSON: a plain string */ }
	}
	return attr;
}

/** The selected values as an array, whichever form `value` takes. */
export function listValues(value: ListValue | null | undefined): string[] {
	if (Array.isArray(value)) return value;
	return value ? [value] : [];
}

/** Row height used until the first option is measured. */
const ESTIMATED_ROW_HEIGHT = 36;
/** Rows rendered beyond each edge of the viewport while virtual. */
const OVERSCAN = 6;
/** Rows rendered before a virtual list has been laid out (no viewport size yet). */
const UNSIZED_ROWS = 20;
/** Typing pause that ends a type-ahead search, in ms. */
const TYPEAHEAD_RESET_MS = 500;
/** Distance from the end, in rows, at which `dj-scroll-end` fires. */
const END_ROWS = 5;

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
	if (warned.has(key)) return;
	warned.add(key);
	console.warn(message);
}

/** TanStack Virtual reads `process.env.NODE_ENV` when a virtualizer is built. A bundler defines it;
 *  a page loading the packages straight from a CDN does not, so give it the production value. */
function ensureProcessEnv() {
	const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
	if (!g.process) g.process = { env: { NODE_ENV: "production" } };
	else if (!g.process.env) g.process.env = { NODE_ENV: "production" };
}

registerDefaults("dj", {
	listReorderGrabbed: "Grabbed {label}. Use the arrow keys to move, space to drop, escape to cancel.",
	listReorderMoved: "{label} moved to position {pos}.",
	listReorderDropped: "{label} dropped.",
	listReorderCancelled: "Cancelled moving {label}.",
	listLoading: "Loading",
});
const EN_REORDER: Record<string, string> = {
	listReorderGrabbed: "Grabbed {label}. Use the arrow keys to move, space to drop, escape to cancel.",
	listReorderMoved: "{label} moved to position {pos}.",
	listReorderDropped: "{label} dropped.",
	listReorderCancelled: "Cancelled moving {label}.",
	listLoading: "Loading",
};

/**
 * `<dj-list>` — a single-select list, or a menu, built from `options`.
 *
 * Coming from Dojo's Listbox? Use this component: it has the listbox role and keyboard model that
 * Listbox had. The list is form-associated and submits `value`.
 *
 * #### Keyboard
 * The list is one tab stop (the active-descendant pattern).
 * - The arrow keys, Home, End, PageUp, and PageDown move the active item.
 * - Typing a letter (or the start of a label) moves to the next option whose label starts with it.
 * - Enter or Space selects it.
 * - On focus with nothing active, the selected option becomes active.
 *
 * #### Long lists
 * - Above `virtual-threshold` rows (default 200, dividers included) the list is virtual: only the
 *   rows in view plus a few either side are in the DOM. Keyboard and type-ahead still cover every
 *   option, and the active option is always rendered.
 * - Every row has one height, `--dj-list-item-height`, or the first option's height measured once.
 *   Labels stay on one line and are cut with an ellipsis.
 * - The list scrolls inside `--dj-list-max-height` (20rem by default while virtual).
 * - Rendered options carry `aria-posinset` and `aria-setsize`, so a screen reader reports
 *   "item 812 of 5,000".
 * - `dj-scroll-end` fires when the user scrolls (or moves) within a few rows of the end, once per
 *   option count. Use it to load the next page.
 *
 * #### Multiple selection
 * - With `multiple`, choosing an option toggles it, `value` is a string array, and the listbox
 *   is `aria-multiselectable`. The form value has one entry per value under `name`.
 * - In markup, give the starting values as a JSON array: `value='["a","b"]'`.
 *
 * #### Options
 * - `menu` switches the roles to `menu` and `menuitem`.
 * - `loading` shows a spinner.
 *
 * #### Reordering
 * - With `reorderable`, items can be dragged with a pointer or touch, or moved with the keyboard:
 *   Space to grab, the arrow keys to move, Space to drop, and Escape to cancel.
 * - Reordering is controlled: the list emits `dj-reorder`, and you reorder `options`.
 * - Reordering is off while the list is virtual; the list warns once in the console.
 *
 * Parts: `list`, `item`.
 *
 */
export class DjList extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.3";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	@query(".list") private listEl!: HTMLElement;

	@property({ type: Array }) options: ListOption[] = [];
	/** The selected value; a string array when `multiple` is set. */
	@property({ converter: { fromAttribute: parseListValue, toAttribute: (v: ListValue) => (Array.isArray(v) ? JSON.stringify(v) : v) } }) value: ListValue = "";
	/** Choosing an option toggles it, and `value` is a string array. */
	@property({ type: Boolean, reflect: true }) multiple = false;
	@property({ reflect: true }) name?: string;
	/** Accessible name for the list/menu container (sets `aria-label` on the listbox/menu,
	 *  which otherwise has no accessible name). Mirrors dj-text-input's `label` approach. */
	@property() label?: string;
	@property({ type: Boolean }) menu = false;
	@property({ type: Boolean }) loading = false;
	/** Progressive enhancement: allow pointer/keyboard reordering of items. Controlled — the
	 *  list emits `dj-reorder` and never mutates `options` itself. */
	@property({ type: Boolean, reflect: true }) reorderable = false;
	/** Row count above which the list renders only the rows in view (dividers count as rows). */
	@property({ type: Number, attribute: "virtual-threshold" }) virtualThreshold = 200;
	@state() private activeIndex = -1;
	/** The value of the item currently "picked up" by the keyboard grab, for visual feedback. */
	@state() private grabbedKey: string | null = null;
	/** Target drop position (among reorderable items) during a keyboard grab; null when idle. */
	@state() private grabIndex: number | null = null;

	#i18n = new LocaleController(this);
	#zone?: DragZoneController;
	#zoneCfg?: DragZoneConfig;
	#grab?: (e: KeyboardEvent) => void;
	#virtualizer?: Virtualizer<HTMLElement, Element>;
	#virtualCleanup?: () => void;
	#rowHeight = ESTIMATED_ROW_HEIGHT;
	#rowMeasured = false;
	/** Position among options (dividers skipped), 1-based, per row; and the option count. */
	#posInSet: Int32Array = new Int32Array(0);
	#setSize = 0;
	#typed = "";
	#typedAt = 0;
	#lastRevealed = -1;
	#endFiredFor = -1;
	#visible = false;
	#sizeObserver?: ResizeObserver;
	#observed?: Element;

	constructor() { super(); this.#internals = this.attachInternals(); }
	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN_REORDER[key] ?? key;
	}
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	formResetCallback() {
		const d = parseListValue(this.getAttribute("value"));
		this.value = this.multiple ? listValues(d) : (Array.isArray(d) ? (d[0] ?? "") : d);
		this.sync();
	}
	private sync() {
		if (!this.multiple) { this.#internals.setFormValue((this.value as string) || null); return; }
		const fd = new FormData();
		for (const v of listValues(this.value)) fd.append(this.name ?? "value", v);
		this.#internals.setFormValue(fd);
	}
	#selected = new Set<string>();
	override focus(options?: FocusOptions) { this.listEl?.focus(options); }
	protected override firstUpdated() { this.sync(); }

	/** True while the list renders only the rows in view (`options` longer than `virtual-threshold`). */
	get virtual(): boolean { return this.opts.length > this.virtualThreshold; }

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#dropVirtualizer();
		this.#sizeObserver?.disconnect();
		this.#sizeObserver = undefined;
		this.#observed = undefined;
	}

	protected override willUpdate(c: Map<PropertyKey, unknown>) {
		if (c.has("value")) this.#selected = new Set(listValues(this.value));
		if (c.has("options")) {
			this.#indexPositions();
			if (this.activeIndex >= this.opts.length) this.activeIndex = -1;
		}
		if (this.virtual) {
			ensureProcessEnv();
			this.#virtualizer ??= this.#makeVirtualizer();
			this.#virtualizer.setOptions({ ...this.#virtualizer.options, count: this.opts.length });
		} else {
			this.#dropVirtualizer();
		}
	}

	protected override updated(c: Map<PropertyKey, unknown>) {
		if (c.has("value") || c.has("multiple") || c.has("name")) this.sync();
		// New options can leave the end in view with no scroll to report it (a short first page).
		if (c.has("options") || c.has("loading")) this.#checkEnd();
		this.#syncReorder();
		this.#observeSize();
		const v = this.#virtualizer;
		if (v) {
			if (!this.#virtualCleanup) this.#virtualCleanup = v._didMount();
			v._willUpdate();
			this.#measureRow();
		}
		if (this.activeIndex !== this.#lastRevealed) {
			this.#lastRevealed = this.activeIndex;
			if (this.activeIndex >= 0) this.#reveal(this.activeIndex);
			this.#checkEnd();
		}
	}

	private get opts(): ListOption[] { return Array.isArray(this.options) ? this.options : []; }
	#isSelectable(i: number): boolean { const o = this.opts[i]; return !!o && !o.disabled && !o.divider; }
	#firstSelectable(): number { const n = this.opts.length; for (let i = 0; i < n; i++) if (this.#isSelectable(i)) return i; return -1; }
	#lastSelectable(): number { for (let i = this.opts.length - 1; i >= 0; i--) if (this.#isSelectable(i)) return i; return -1; }
	/** Nearest selectable row at or past `from` in direction `step`, without wrapping; -1 if none. */
	#scanFrom(from: number, step: 1 | -1): number {
		for (let i = from; i >= 0 && i < this.opts.length; i += step) if (this.#isSelectable(i)) return i;
		return -1;
	}
	#selectedIndex(): number { return this.#selected.size ? this.opts.findIndex((o) => !o.divider && this.#selected.has(o.value)) : -1; }

	#indexPositions() {
		const n = this.opts.length;
		const pos = new Int32Array(n);
		let count = 0;
		for (let i = 0; i < n; i++) if (!this.opts[i].divider) pos[i] = ++count;
		this.#posInSet = pos;
		this.#setSize = count;
		this.#endFiredFor = -1;
	}

	// ------------------------------------------------------------------ virtual window

	#makeVirtualizer(): Virtualizer<HTMLElement, Element> {
		return new Virtualizer<HTMLElement, Element>({
			count: this.opts.length,
			getScrollElement: () => (this.listEl instanceof HTMLUListElement ? this.listEl : null),
			estimateSize: () => this.#rowHeight,
			overscan: OVERSCAN,
			scrollToFn: elementScroll,
			observeElementRect: (inst, cb) => observeElementRect(inst, () => {
				const el = inst.scrollElement;
				if (el) cb({ width: el.clientWidth, height: el.clientHeight });
			}),
			observeElementOffset,
			onChange: () => this.requestUpdate(),
		});
	}

	#dropVirtualizer() {
		this.#virtualCleanup?.();
		this.#virtualCleanup = undefined;
		this.#virtualizer = undefined;
		this.#rowMeasured = false;
	}

	/** Measure the first rendered option once and use its height for every row. */
	#measureRow() {
		if (this.#rowMeasured) return;
		const item = this.listEl?.querySelector<HTMLElement>('li[part="item"]');
		const h = item?.getBoundingClientRect().height ?? 0;
		if (h <= 0) return;
		this.#rowMeasured = true;
		if (Math.abs(h - this.#rowHeight) > 0.5) {
			this.#rowHeight = h;
			this.#virtualizer?.measure();
			this.requestUpdate();
			// Anything revealed with the estimate is now off by the difference.
			this.#revealCurrent();
		}
	}

	/** The row indexes to render while virtual: the virtualizer's window plus the active row. */
	#windowRows(): number[] {
		const n = this.opts.length;
		let rows = this.#virtualizer?.getVirtualIndexes() ?? [];
		if (!rows.length) rows = Array.from({ length: Math.min(n, UNSIZED_ROWS) }, (_, i) => i);
		const a = this.activeIndex;
		if (a >= 0 && a < n && !rows.includes(a)) rows = [...rows, a].sort((x, y) => x - y);
		return rows;
	}

	/** Top of row `i` inside the list's padding box. */
	#rowTop(i: number): number {
		if (this.virtual) return this.#padTop() + i * this.#rowHeight;
		return this.listEl?.querySelector<HTMLElement>(`#opt-${i}`)?.offsetTop ?? 0;
	}
	#padTop(): number {
		const el = this.listEl;
		return el ? parseFloat(getComputedStyle(el).paddingTop) || 0 : 0;
	}

	/** Scroll the list (not the page) just enough to show row `i`. */
	#reveal(i: number) {
		const el = this.listEl;
		if (!el || el.clientHeight === 0) return;
		const top = this.#rowTop(i);
		const height = this.virtual ? this.#rowHeight : (el.querySelector<HTMLElement>(`#opt-${i}`)?.offsetHeight ?? 0);
		const pad = this.#padTop();
		if (top - pad < el.scrollTop) el.scrollTop = Math.max(0, top - pad);
		else if (top + height + pad > el.scrollTop + el.clientHeight) el.scrollTop = top + height + pad - el.clientHeight;
	}

	/** Show the active option, or the selected one when nothing is active. */
	#revealCurrent() {
		const i = this.activeIndex >= 0 ? this.activeIndex : this.#selectedIndex();
		if (i >= 0) this.#reveal(i);
	}

	/** When the list goes from hidden (zero height) to shown, as in a popup opening, show the
	 *  active option, or the selected one. */
	#observeSize() {
		const el = this.listEl;
		if (!el || el === this.#observed || typeof ResizeObserver === "undefined") return;
		this.#sizeObserver ??= new ResizeObserver(() => {
			const shown = (this.listEl?.clientHeight ?? 0) > 0;
			if (shown && !this.#visible) {
				if (this.virtual) this.#measureRow();
				this.#revealCurrent();
			}
			this.#visible = shown;
		});
		if (this.#observed) this.#sizeObserver.unobserve(this.#observed);
		this.#sizeObserver.observe(el);
		this.#observed = el;
	}

	/** Fire `dj-scroll-end` once per option count when the view or the active row nears the end. */
	#checkEnd() {
		const n = this.opts.length;
		if (!n || this.#endFiredFor === n) return;
		const el = this.listEl;
		const nearByScroll = !!el && el.clientHeight > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - END_ROWS * this.#rowHeight;
		const nearByActive = this.activeIndex >= 0 && this.activeIndex >= n - END_ROWS;
		if (!nearByScroll && !nearByActive) return;
		this.#endFiredFor = n;
		this.emit("dj-scroll-end", { detail: { count: n } });
	}

	#onFocus() {
		if (this.activeIndex < 0) {
			const i = this.#selectedIndex();
			if (i >= 0 && this.#isSelectable(i)) this.activeIndex = i;
		}
	}

	private select(index: number) {
		const opt = this.options[index];
		if (!opt || opt.disabled || opt.divider) return;
		if (this.multiple) {
			const vals = listValues(this.value);
			this.value = vals.includes(opt.value) ? vals.filter((v) => v !== opt.value) : [...vals, opt.value];
		} else {
			this.value = opt.value;
		}
		this.activeIndex = index;
		this.sync();
		this.emit("change");
	}

	private move(forward: boolean) {
		const n = this.opts.length;
		if (!n) return;
		const a = this.activeIndex;
		if (a < 0) { this.activeIndex = forward ? this.#firstSelectable() : this.#lastSelectable(); return; }
		const next = this.#scanFrom(a + (forward ? 1 : -1), forward ? 1 : -1);
		this.activeIndex = next !== -1 ? next : (forward ? this.#firstSelectable() : this.#lastSelectable());
	}

	/** Move by a viewport of rows, stopping at the first or last option rather than wrapping. */
	#page(forward: boolean) {
		const el = this.listEl;
		const rows = Math.max(1, Math.floor((el?.clientHeight ?? 0) / this.#rowHeight) - 1);
		const from = this.activeIndex < 0 ? (forward ? -1 : this.opts.length) : this.activeIndex;
		const target = Math.min(this.opts.length - 1, Math.max(0, from + (forward ? rows : -rows)));
		const i = this.#scanFrom(target, forward ? -1 : 1);
		const fallback = forward ? this.#lastSelectable() : this.#firstSelectable();
		this.activeIndex = i === -1 || (forward ? i < from : i > from) ? fallback : i;
	}

	/** Type-ahead: jump to the next option whose label starts with the typed text. Typing the
	 *  same letter again cycles through the options starting with it. */
	#typeAhead(key: string): boolean {
		const now = Date.now();
		if (now - this.#typedAt > TYPEAHEAD_RESET_MS) this.#typed = "";
		this.#typedAt = now;
		const k = key.toLowerCase();
		const typed = this.#typed + k;
		const cycling = typed.length > 1 && [...typed].every((c) => c === k);
		const search = cycling ? k : typed;
		this.#typed = typed;
		const n = this.opts.length;
		const start = this.activeIndex < 0 ? 0 : this.activeIndex + (search.length === 1 ? 1 : 0);
		for (let step = 0; step < n; step++) {
			const i = (start + step) % n;
			const o = this.opts[i];
			if (this.#isSelectable(i) && (o.label ?? o.value).toLowerCase().startsWith(search)) { this.activeIndex = i; return true; }
		}
		return false;
	}

	// ------------------------------------------------- public active-item API (caret-anchored menus)
	// Drive the active (highlighted) option from outside the list — used by the rich-text mention and
	// slash menus, which keep DOM focus in the editor and steer this list programmatically. Built on
	// the same private selectable-walk as the keyboard handler; `activeIndex` stays private.

	/** Move the highlighted (active) option by one selectable step, wrapping; skips disabled items and dividers. */
	moveActive(delta: 1 | -1): void { this.move(delta === 1); }

	/** Highlight the first selectable option (skipping disabled items and dividers); clears the highlight if none. */
	activateFirst(): void { this.activeIndex = this.#firstSelectable(); }

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
		if (this.#grab && e.key !== "Enter") {
			this.#grab(e);
			if (e.defaultPrevented) return;
		}
		switch (e.key) {
			case "ArrowDown": e.preventDefault(); this.move(true); break;
			case "ArrowUp": e.preventDefault(); this.move(false); break;
			case "Home": e.preventDefault(); this.activeIndex = this.#firstSelectable(); break;
			case "End": e.preventDefault(); this.activeIndex = this.#lastSelectable(); break;
			case "PageDown": e.preventDefault(); this.#page(true); break;
			case "PageUp": e.preventDefault(); this.#page(false); break;
			case "Enter": if (this.activeIndex >= 0) { e.preventDefault(); this.select(this.activeIndex); } break;
			case " ":
				// Space inside a type-ahead search is part of the text ("New York"); otherwise it selects.
				if (this.#typed && Date.now() - this.#typedAt <= TYPEAHEAD_RESET_MS) { if (this.#typeAhead(" ")) e.preventDefault(); break; }
				if (this.activeIndex >= 0) { e.preventDefault(); this.select(this.activeIndex); }
				break;
			default:
				if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && this.#typeAhead(e.key)) e.preventDefault();
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
		const reorder = this.reorderable && !this.virtual;
		if (this.reorderable && this.virtual) warnOnce("reorder-virtual", "dj-list: reorderable is off while the list is virtual (more options than virtual-threshold).");
		if (reorder && !this.#zone) {
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
		} else if (!reorder && this.#zone) {
			this.#zone.hostDisconnected();
			this.removeController(this.#zone);
			this.#zone = undefined;
			this.#zoneCfg = undefined;
			this.#grab = undefined;
		}
	}

	#renderOption(o: ListOption, i: number, top?: number): TemplateResult {
		const selected = this.#selected.has(o.value);
		const active = i === this.activeIndex;
		const grabbed = this.grabbedKey === o.value;
		const virtual = top !== undefined;
		return html`<li
			id=${`opt-${i}`} part="item" data-key=${o.value}
			class="item ${active ? "item--active" : ""} ${selected ? "item--selected" : ""} ${o.disabled ? "item--disabled" : ""} ${grabbed ? "item--grabbed" : ""}"
			style=${virtual ? `transform:translateY(${top}px)` : nothing}
			aria-posinset=${virtual ? this.#posInSet[i] : nothing}
			aria-setsize=${virtual ? this.#setSize : nothing}
			aria-grabbed=${this.#zone ? (grabbed ? "true" : "false") : nothing}
			role=${this.menu ? "menuitem" : "option"}
			aria-selected=${this.menu ? nothing : (selected ? "true" : "false")}
			aria-disabled=${o.disabled ? "true" : nothing}
			@click=${() => this.select(i)}
			@pointermove=${() => { if (!o.disabled) this.activeIndex = i; }}
		>
			<dj-icon class="check" size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
			<span class="label">${o.label ?? o.value}</span>
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

	/** The rows in the virtual window, each placed at its offset; the list's `::after` holds the
	 *  full height so the scrollbar spans every option. */
	#renderWindow(): TemplateResult[] {
		const pad = this.#padTop();
		return this.#windowRows().map((i) => {
			const o = this.opts[i];
			const top = pad + i * this.#rowHeight;
			if (o.divider) return html`<li role="separator" class="divider" style=${`transform:translateY(${top}px);height:${this.#rowHeight}px`}></li>`;
			return this.#renderOption(o, i, top);
		});
	}

	override render() {
		if (this.loading) {
			return html`<div part="list" class="list"><div class="loading"><dj-loading-indicator type="circular-small" label=${this.#msg("listLoading")}></dj-loading-indicator></div></div>`;
		}
		const activeId = this.activeIndex >= 0 ? `opt-${this.activeIndex}` : nothing;
		const virtual = this.virtual;
		return html`<ul
			part="list" class="list ${virtual ? "list--virtual" : ""}" role=${this.menu ? "menu" : "listbox"}
			aria-label=${this.label ?? nothing}
			aria-multiselectable=${this.multiple && !this.menu ? "true" : nothing}
			tabindex="0" aria-activedescendant=${activeId}
			style=${virtual ? `--dj-list-total:${this.opts.length * this.#rowHeight}px` : nothing}
			@keydown=${this.onKeyDown} @focus=${this.#onFocus} @scroll=${this.#checkEnd}
		>
			${virtual ? this.#renderWindow() : this.#renderRows()}
			</ul>
		<div class="announce" aria-live="polite"></div>`;
	}
}
export default DjList;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-reorder": CustomEvent<ReorderDetail>;
		"dj-scroll-end": CustomEvent<{ count: number }>;
	}
}
