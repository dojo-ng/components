import { html, nothing, type TemplateResult } from "lit";
import { property, state, query } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";
import DojoElement, { isTextEntryTarget } from "@dojo-ng/dojo-element";
import {
	createTable, getCoreRowModel, getSortedRowModel, functionalUpdate,
	type Table, type TableOptionsResolved, type TableState, type ColumnDef, type Cell, type Header as TableHeader,
	type Row as TableRow, type SortingState, type RowSelectionState, type Updater, type AggregationFnOption,
} from "@tanstack/table-core";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";
import type { DataGridPlugin, DataGridContext } from "./plugin.js";
import { RowCache } from "./row-cache.js";
import styles from "./dj-data-grid.styles.js";

export type Row = Record<string, unknown>;

/** Plugins that need every row on the client, by `name`. Remote mode leaves them out. */
const REMOTE_UNSUPPORTED = new Set(["tree", "groups", "filter", "pagination", "edit", "detail", "export"]);

// Reconcile a plain attribute map onto a row element across re-renders and virtualizer recycling:
// remove keys a plugin stopped returning, set the current ones. The `ref` callback runs every render.
const rowAttrKeys = new WeakMap<Element, Set<string>>();
function applyRowAttrs(el: Element, attrs: Record<string, string>) {
	const prev = rowAttrKeys.get(el);
	if (prev) for (const k of prev) if (!(k in attrs)) el.removeAttribute(k);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	rowAttrKeys.set(el, new Set(Object.keys(attrs)));
}

export interface GridColumn {
	id: string;
	header?: string;
	accessorKey?: string;
	sortable?: boolean;
	width?: string;
	/** Derive the cell value from the whole row (calculated columns). Maps to a TanStack
	 *  `accessorFn`. A row total is `compute: r => r.a + r.b`; no plugin needed. */
	compute?: (row: Row) => unknown;
	/** TanStack aggregation for this column when grouping (set by the groups plugin's columns()
	 *  hook; copied onto the ColumnDef). Core never sets it itself. */
	aggregationFn?: AggregationFnOption<Row>;
}
/**
 * What is selected, in a form that works when most rows are not loaded. `all` false: `ids` are the
 * selected row ids. `all` true: every row is selected except `except`. `count` is the number
 * selected either way. From `grid.selection` and `dj-selection-change`.
 */
export interface GridSelection { ids: string[]; all: boolean; except: string[]; count: number }
/** Rows inside the viewport, inclusive; both -1 when there are none. From `getVisibleRange()`. */
export interface VisibleRange { first: number; last: number }
export type SelectionMode = "none" | "single" | "multiple";
/**
 * What a plain click / Enter on a row MEANS.
 *  - `"none"` (default): click and Space/Enter toggle selection — exactly the original behavior.
 *  - `"click"`: a single click activates the row (the mail/preview-pane idiom).
 *  - `"double"`: a double click activates it (the file-manager idiom).
 *
 * Under any non-`"none"` mode a plain click activates and does NOT toggle selection: opening a
 * row and selecting rows become separate gestures. Selection then comes from Space, from
 * modifier-clicks, and from a checkbox column (`@dojo-ng/data-grid-select`).
 */
export type ActivationMode = "none" | "click" | "double";

/**
 * `<dj-data-grid>` — a virtualized, sortable, selectable data grid built on TanStack Table and
 * TanStack Virtual.
 *
 * Give it `columns`, `data`, and a `height`. The core covers columns, in-memory data, sorting,
 * virtual rows, row selection, keyboard row navigation, and calculated columns
 * (`GridColumn.compute`). Everything else is a plugin. The grid has ARIA role `grid`.
 *
 * #### Plugins
 * - Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail are
 *   plugins. Pass an array of plugin objects to the `plugins` property, from JavaScript only.
 * - A recommended order: one structural plugin first (`treePlugin` or `groupsPlugin`, never both),
 *   then `editPlugin`, `cellComponentsPlugin`, and `formatsPlugin`, then the plugins that only add
 *   controls (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`).
 * - Changing `plugins` rebuilds the table, so set it once, early.
 *
 * #### Opening rows: `activation`
 * `activation` decides what a plain click or Enter means on a row.
 * - `"none"` (the default): click, Space, and Enter all toggle selection.
 * - `"click"` (the mail and preview-pane idiom) or `"double"` (the file-manager idiom): a plain
 *   click, or a double click, opens the row and emits `dj-activate` with `{ row, index }`, where
 *   `row` is the original row data. Selection does not change.
 * - With activation on, Enter opens the row and Space selects it.
 * - Modifier clicks always select and never open: Ctrl or Cmd-click toggles a row, and Shift-click
 *   selects a range when the checkbox column from `@dojo-ng/data-grid-select` is installed (without
 *   it, Shift-click only moves the active row).
 * - `"double"` uses the browser's own `dblclick`, so the two clicks inside a double click never
 *   open the row on their own.
 * - Activation works with any `selection-mode`, including `"none"`, so a read-only list can have
 *   clickable rows.
 * - To open rows by clicking while the user also builds a set for bulk actions, combine
 *   `activation="click"`, `selection-mode="multiple"`, and the checkbox column from
 *   `@dojo-ng/data-grid-select`.
 *
 * #### Rendered rows: `dj-range-change`
 * - `dj-range-change` fires when the window of rendered rows moves, so you can load data in and
 *   out, or load more at the end of the list.
 * - The detail is `{ start, end, count, rendered }`: the first and last rendered row index
 *   (inclusive), the total number of rows, and the list of rendered indexes.
 * - The range includes the 8 extra rows the grid renders beyond each edge of the viewport. It is
 *   what the grid has rendered, not what the user can see, so fetching this range never leaves a
 *   gap.
 * - To load more at the end: `if (e.detail.end >= e.detail.count - 1) loadMore()`.
 * - When nothing is rendered, `start` and `end` are -1 and `count` is the real count.
 * - The event fires after rendering and only when `(start, end, count)` changes, so setting `data`
 *   in the handler is safe.
 *
 * #### Focus and the active row
 * - `focus()` on the host moves focus into the grid, so a consumer can return the keyboard to it
 *   (after closing a dialog, say) without reaching into the shadow root.
 * - The grid shows a focus ring when it has keyboard focus, and the active row gets a stronger
 *   marker while the grid is focused.
 * - The active row (the keyboard cursor) and each selected row carry extra parts, `row--active`
 *   and `row--selected`, alongside `row`, so a consumer can restyle them:
 *   `dj-data-grid::part(row--selected) { color: inherit }`. Plugin-contributed row parts (from
 *   `@dojo-ng/data-grid-rowstate`) are kept alongside them. Match rows with `[part~="row"]`,
 *   not `[part="row"]`, since a row can carry several parts.
 * - `dj-active-change` fires when the user moves the active row with the keyboard or a click,
 *   with detail `{ index, row }`, where `row` is the original row data. Setting `activeIndex`
 *   from code does not fire it, the same way setting a native input's `value` fires no `change`.
 *
 * #### Keyboard
 * - The grid is one tab stop. ArrowUp and ArrowDown move the active row, PageUp and PageDown
 *   move by a screen, Home and End go to the first and last row, Space selects, and Enter
 *   activates (see `activation`).
 * - Sorting from the keyboard: ArrowUp on the first row moves to the header row. Left and Right
 *   move between headers (mirrored in right-to-left layouts), Home and End go to the first and
 *   last header, Enter or Space sorts the column, and ArrowDown returns to the first row.
 * - A sortable header holds a `<button part="sort-button">`, which is not a tab stop of its own.
 *   `aria-sort` is `ascending` or `descending` on the sorted column and absent elsewhere. A column
 *   with `sortable: false` gets no button, so a plugin control in its header (the select-all
 *   checkbox) is never inside one.
 * - Keys typed into a control inside the grid (a filter input, an edit field) go to that
 *   control, not the grid.
 *
 * #### Printing
 * - When the page is printed, every row becomes part of a real `<table>` with a `<thead>`, and
 *   browsers repeat the header on each printed page. This does not apply to rows drawn by the
 *   detail plugin (`@dojo-ng/data-grid-detail`).
 * - Safari does not repeat the table header on each printed page. This is a WebKit limitation with
 *   no reliable CSS fix.
 *
 * #### Rows from a server: `rowCount`
 * Set `rowCount` to the total number of rows on the server to turn on remote mode. `data` is then
 * ignored, the scrollbar is sized from `rowCount`, and the grid asks for the rows it needs.
 *
 * The recipe:
 * - Give the grid `columns`, `rowCount`, and a `getRowId`, so selection survives rows being dropped
 *   from the cache.
 * - Listen for `dj-rows-request`, detail `{ start, end, epoch, reason }`: an inclusive,
 *   block-aligned range of absolute indices. Fetch those rows, in the order `grid.sorting` names,
 *   and answer with `grid.setRows(start, rows, epoch)`, passing back the request's `epoch`.
 * - `reason` is `"range"` for rows coming on screen and `"selection"` for a Shift range waiting on
 *   rows. Answer both the same way.
 * - Rows not loaded yet render as placeholder rows (part `row--placeholder`, `aria-busy="true"`).
 *   Plugin cell and row hooks are not called for them.
 *
 * The epoch rule:
 * - The grid starts a new epoch whenever the list changes under it: `insertRows`, `removeRows`,
 *   `resetRows`, and a sort. `setRows` with an older epoch keeps nothing and returns `false`, and
 *   the grid asks again for any rows still needed. So a host never has to cancel requests or
 *   reconcile late answers; it only passes the epoch back.
 *
 * Loading and the cache:
 * - Rows load in blocks of `blockSize` (default 100), so a block is never fetched twice in an epoch.
 * - The grid keeps at most `cacheSize` rows (default 2,000) and drops the blocks farthest from the
 *   screen first. Blocks on screen are never dropped.
 * - After a jump of more than one screen (a scrollbar drag, End), the grid waits until the rows on
 *   screen have held still for `settleMs` (default 100) before asking.
 *
 * Indices, keyboard, and changes:
 * - Every index is absolute: `activeIndex`, event indices, and `aria-rowindex` count from the top
 *   of the full list, loaded or not. End goes to `rowCount - 1`. When the active row is not loaded
 *   yet, `dj-active-change` fires with `row: undefined`, then again with the row once it arrives.
 *   `dj-activate` does nothing on a placeholder.
 * - Sorting is the host's job. A header click updates `sorting`, emits `dj-sort`, drops the
 *   cached rows, scrolls to the top (the active row goes to 0), and requests the top rows in a
 *   new epoch. The grid never reorders rows it is given.
 * - When rows are added or removed on the server, call `insertRows(index, rowsOrCount)` or
 *   `removeRows(index, count)`. Cached rows, `activeIndex`, and the Shift anchor move with their
 *   rows, and a change above the screen scrolls by the same amount so nothing on screen jumps.
 *   For anything else, `resetRows()`. `getVisibleRange()` and `scrollToIndex()` let a host keep
 *   the user's place across a refresh.
 *
 * Selection:
 * - Select all means every row on the server, loaded or not: `selectAll()` turns on `allSelected`,
 *   and `rowSelection` then holds the rows the user deselected. `clearSelection()` turns it off.
 * - `dj-selection-change` carries `{ rows, ids, all, except, count }`. `rows` is only the loaded
 *   selected rows, so act on `ids` (or `all` and `except`) and `count`. `grid.selection` returns
 *   the same without `rows`. Inserts, removals, resets, and sorts keep select all on.
 * - A Shift range (`@dojo-ng/data-grid-select`) over rows that are not loaded asks for them and
 *   selects once they have all arrived. If the list changes first, the range is dropped.
 *
 * Plugins:
 * - Supported: `selectColumnPlugin`, `rowDragPlugin` (its events carry the same `selection`),
 *   `rowStatePlugin`, `cellComponentsPlugin`, and `formatsPlugin`.
 * - Not supported, because they need every row on the client: `treePlugin`, `groupsPlugin`,
 *   `filterPlugin`, `paginationPlugin`, `editPlugin`, `detailPlugin`, and `exportPlugin`. The grid
 *   leaves them out and logs one console warning naming them. Filter, group, and thread on the
 *   server instead.
 *
 * Limits:
 * - Rows have a fixed height (`rowHeight`).
 * - Printing prints the cached rows only, not the whole list.
 * - Browsers stop growing an element at about 17.8 million px (Firefox; Chromium and WebKit allow
 *   about 33 million). At the default 36 px row that is about 490,000 rows; past that the
 *   scrollbar cannot reach the end. Lower `rowHeight` raises the limit.
 *
 * Events: `dj-sort`, `dj-selection-change` (detail `{ rows, ids, all, except, count }`), `dj-activate` (detail `{ row, index }`, where `row` is
 * the original row data), `dj-active-change` (detail `{ index, row }`), `dj-range-change` (detail `{ start, end, count, rendered }` — inclusive
 * first and last rendered row-model indices, the total row count, and the full index list; `start`
 * and `end` are -1 when nothing is rendered), `dj-rows-request` (detail `{ start, end, epoch, reason }`,
 * remote mode only). Parts: `grid`, `head`, `row`, `row--active`, `row--selected`,
 * `row--placeholder`, `cell`, `chrome-top`, `chrome-bottom`, `subhead`, `sort-button`.
 *
 * @cssprop --dj-data-grid-placeholder - The bar drawn in each cell of a row that is not loaded yet.
 */
export class DjDataGrid extends DojoElement {
	static override styles = styles;
	static override version = "0.3.1";
	static override focusable = true;

	@property({ type: Array }) columns: GridColumn[] = [];
	@property({ type: Array }) data: Row[] = [];
	@property({ attribute: "selection-mode", reflect: true }) selectionMode: SelectionMode = "none";
	/** What a plain click / Enter on a row means. Default `"none"` = the original toggle behavior. */
	@property({ attribute: "activation", reflect: true }) activation: ActivationMode = "none";
	@property({ attribute: "row-height", type: Number }) rowHeight = 36;
	@property() height = "20rem";
	/** Plugin set. Set in JavaScript (rich data). Declared up front because TanStack row models
	 *  must exist at table creation; a post-mount change rebuilds the table. Default `[]`. */
	@property({ attribute: false }) plugins: DataGridPlugin[] = [];
	/** Total number of rows on the server. A number turns on remote mode, where `data` is ignored
	 *  and rows arrive through `dj-rows-request` and `setRows`. Default `undefined` (rows come
	 *  from `data`). */
	@property({ attribute: "row-count", type: Number }) rowCount?: number;
	/** Remote mode: rows per request block. Requests always name whole blocks. Default `100`. */
	@property({ attribute: "block-size", type: Number }) blockSize = 100;
	/** Remote mode: after a jump of more than one screen, wait this many milliseconds for the
	 *  rows on screen to hold still before requesting rows. `0` requests at once. Default `100`. */
	@property({ attribute: "settle-ms", type: Number }) settleMs = 100;
	/** Remote mode: the most rows the grid keeps loaded. Blocks farthest from the screen are
	 *  dropped first; blocks on screen never are. Default `2000`. */
	@property({ attribute: "cache-size", type: Number }) cacheSize = 2000;
	/** Optional stable row id accessor; defaults to row index. In remote mode the index is the
	 *  absolute row index. */
	getRowId?: (row: Row, index: number) => string;

	@state() sorting: SortingState = [];
	/** TanStack's selection record, keyed by row id. While `allSelected` is true it is inverted:
	 *  it holds the rows the user deselected. */
	@state() rowSelection: RowSelectionState = {};
	/** Remote mode: every row is selected except those in `rowSelection`. Set by `selectAll()`,
	 *  cleared by `clearSelection()`. Always false outside remote mode. */
	@state() allSelected = false;
	@state() activeIndex = 0;
	/** The header cell holding the keyboard position, or null while it is on a body row. ArrowUp
	 *  from row 0 moves it into the header row; ArrowDown or a row click moves it back. */
	@state() private headerCol: number | null = null;
	/** True between `beforeprint` and `afterprint`. Swaps the render loop from the virtualizer's
	 *  rendered window to every row, since only the visible slice plus overscan is normally in the
	 *  DOM and printing would otherwise yield one screenful followed by blank space. */
	@state() private printing = false;

	@query(".scroll") private scrollEl!: HTMLElement;

	#table!: Table<Row>;
	/** Read-only access to the live TanStack table, so consumers outside a plugin (CSV export,
	 *  tests) can reach it. Rebuilt when `plugins` changes; do not cache across rebuilds. */
	get table(): Table<Row> { return this.#table; }

	/** Forward focus to the element that owns the keyboard (the `role="grid"` div). The print
	 *  table also carries `part="grid"`, so this selects by class, not by part. */
	override focus(options?: FocusOptions) {
		this.renderRoot.querySelector<HTMLElement>(".grid")?.focus(options);
	}
	override blur() {
		this.renderRoot.querySelector<HTMLElement>(".grid")?.blur();
	}
	/** The plugin array the table was last built with. Compared by reference in willUpdate so a
	 *  `plugins` assignment ALWAYS rebuilds — including one landing between upgrade-time
	 *  connectedCallback and the first update flush (script-after-import order), which a
	 *  changedProperties-based guard mistakes for the initial cycle. */
	#builtPlugins?: DataGridPlugin[];
	/** Whether the table was last built in remote mode; entering or leaving it rebuilds, since the
	 *  plugin set differs (see `#active`). */
	#builtRemote = false;
	/** The plugins the grid uses: all of `plugins`, minus those remote mode cannot support. */
	#active: DataGridPlugin[] = [];
	#warnedFor?: DataGridPlugin[];
	/** Choose `#active` for the current plugins and mode, warning once per plugin set. */
	#pickPlugins() {
		if (!this.#isRemote) { this.#active = this.plugins; this.#warnedFor = undefined; return; }
		const dropped = this.plugins.filter((p) => REMOTE_UNSUPPORTED.has(p.name));
		this.#active = dropped.length ? this.plugins.filter((p) => !dropped.includes(p)) : this.plugins;
		// A reconnect rebuilds the table too; only a new plugin set or a return to remote mode warns.
		if (dropped.length && this.#warnedFor !== this.plugins) {
			this.#warnedFor = this.plugins;
			console.warn(`dj-data-grid: remote mode (rowCount) does not support these plugins; they are left out: ${dropped.map((p) => p.name).join(", ")}.`);
		}
	}
	#tstate!: TableState;
	/**
	 * The plugin context. A CLASS FIELD, so it exists before the first table does: `columns()`
	 * runs inside `createTable` and needs host state — `selectionMode` decides whether the select
	 * plugin contributes a column at all, and a wrong answer there desyncs the grid template (which
	 * recomputes `columns()` at render) from the column defs (built during table creation).
	 * `table` is a live getter, so one stable context object spans every rebuild.
	 */
	#ctx: DataGridContext = this.#makeContext();
	#makeContext(): DataGridContext {
		const ctx = {
			host: this,
			refresh: () => this.requestUpdate(),
			rowAt: (index: number) => this.#rowAt(index),
			indexOf: (row: TableRow<Row>) => this.#indexOf(row),
			rowIds: (first: number, last: number) => this.#rowIds(first, last),
		} as unknown as DataGridContext;
		Object.defineProperty(ctx, "table", { get: () => this.#table, enumerable: true });
		return ctx;
	}
	#disposers: Array<() => void> = [];
	#virtualizer?: Virtualizer<HTMLElement, Element>;
	#cleanup?: () => void;

	/**
	 * Rendered row range, captured in `render()` and emitted from `updated()`.
	 *
	 * `getVirtualItems()` is only callable during render, but dispatching there would fire an event
	 * inside Lit's render cycle — a consumer that responds by setting `data` would re-enter the
	 * render. So render only STASHES the range here; `updated()` (the safe post-render hook) does
	 * the comparing and emitting.
	 */
	#range?: { start: number; end: number; count: number; rendered: number[] };
	/** Last emitted (start, end, count). Unchanged triple = no event, so ordinary re-renders
	 *  (a selection toggle, a flags patch) stay silent and only real scrolling or a data change
	 *  produces one. `rendered` is not compared: it is derived from the same virtual items. */
	#emittedRange?: { start: number; end: number; count: number };

	// ---- Remote mode (`rowCount`) ----
	#cache = new RowCache();
	/** What TanStack is fed in remote mode: the cached rows, in absolute order. */
	#remoteData: Row[] = [];
	/** TanStack data position -> absolute index, and back. */
	#remoteIdx: number[] = [];
	#remotePos = new Map<number, number>();
	#warnedRowId = false;
	/** The range seen by the previous updated(), to tell a jump from ordinary scrolling. */
	#prevRange?: { start: number; end: number };
	#settleTimer?: ReturnType<typeof setTimeout>;
	/** The active row announced with `row: undefined`; announced again when its block lands. */
	#pendingActive?: number;
	/** Set by a remote sort: skip requests until the rendered range moves (to the top). */
	#awaitScroll = false;

	get #isRemote(): boolean { return typeof this.rowCount === "number" && Number.isFinite(this.rowCount); }
	/** Rows the virtualizer and the indices span: `rowCount` in remote mode, else the row model. */
	#rowTotal(): number {
		if (this.#isRemote) return Math.max(0, Math.floor(this.rowCount!));
		return this.#table?.getRowModel().rows.length ?? 0;
	}
	/** The TanStack row at an index (absolute in remote mode), or undefined if it is not loaded. */
	#rowAt(index: number): TableRow<Row> | undefined {
		if (!this.#isRemote) return this.#table?.getRowModel().rows[index];
		const pos = this.#remotePos.get(index);
		return pos === undefined ? undefined : this.#table?.getCoreRowModel().rows[pos];
	}
	#indexOf(row: TableRow<Row>): number {
		if (this.#isRemote) return this.#remoteIdx[row.index] ?? -1;
		return this.#table?.getRowModel().rows.indexOf(row) ?? -1;
	}
	/** Test-only: the number of rows in the remote cache. Not public API. */
	get _cachedRowCount(): number { return this.#cache.size; }
	/** The current remote epoch; a `dj-rows-request` carries it and `setRows` must return it. */
	get epoch(): number { return this.#cache.epoch; }

	/**
	 * Remote mode: answer a `dj-rows-request`. `start` is the absolute index of `rows[0]`; pass back
	 * the request's `epoch`. Returns `false`, and keeps nothing, when the epoch is stale (the list
	 * changed since the request) or the grid is not in remote mode.
	 */
	setRows(start: number, rows: Row[], epoch: number): boolean {
		if (!this.#isRemote || epoch !== this.#cache.epoch) return false;
		this.#cache.put(start, rows, this.#rowTotal());
		this.#capture(start, rows);
		const r = this.#range;
		this.#cache.evict(this.cacheSize, r?.start ?? -1, r?.end ?? -1);
		this.#syncRemoteData();
		const i = this.#pendingActive;
		if (i !== undefined && i === this.activeIndex) {
			const row = this.#rowAt(i);
			if (row) {
				this.#pendingActive = undefined;
				this.emit("dj-active-change", { detail: { index: i, row: row.original } });
			}
		}
		return true;
	}

	/** The current selection as `{ ids, all, except, count }`; see `GridSelection`. */
	get selection(): GridSelection {
		const { ids, all, except, count } = this.#selectionDetail();
		return { ids, all, except, count };
	}

	/**
	 * Select every row. In remote mode this is every row on the server, loaded or not
	 * (`allSelected`); elsewhere it selects every row in the row model. Needs
	 * `selectionMode="multiple"`. Emits `dj-selection-change`.
	 */
	selectAll() {
		if (this.selectionMode !== "multiple") return;
		if (!this.#isRemote) { this.#table.toggleAllRowsSelected(true); return; }
		this.#setSelection(true, {});
	}

	/** Deselect every row and turn `allSelected` off. Emits `dj-selection-change` if anything was
	 *  selected. */
	clearSelection() {
		if (!this.allSelected && !Object.keys(this.#tstate.rowSelection ?? {}).length) return;
		this.#setSelection(false, {});
	}

	/** Replace the selection state outright and announce it. */
	#setSelection(all: boolean, record: RowSelectionState) {
		this.allSelected = all && this.#isRemote;
		this.#tstate = { ...this.#tstate, rowSelection: record };
		this.rowSelection = record;
		this.#table.setOptions((o) => ({ ...o, state: this.#tstate }));
		this.emit("dj-selection-change", { detail: this.#selectionDetail() });
		this.requestUpdate();
	}

	/** Whether a row is selected, reading `rowSelection` inverted while `allSelected` is on. */
	#isSelected(row: TableRow<Row>): boolean {
		return row.getIsSelected() !== this.allSelected;
	}

	/** The `dj-selection-change` detail. Outside remote mode `ids` are the ids of `rows`. */
	#selectionDetail(): GridSelection & { rows: Row[] } {
		const record = this.#tstate?.rowSelection ?? {};
		const marked = Object.keys(record).filter((k) => record[k]);
		if (this.#isRemote && this.allSelected) {
			const rows = (this.#table?.getCoreRowModel().rows ?? []).filter((r) => !record[r.id]).map((r) => r.original);
			return { rows, ids: [], all: true, except: marked, count: Math.max(0, this.#rowTotal() - marked.length) };
		}
		const sel = this.#table?.getSelectedRowModel().rows ?? [];
		const ids = this.#isRemote ? marked : sel.map((r) => r.id);
		return { rows: sel.map((r) => r.original), ids, all: false, except: [], count: ids.length };
	}

	// ---- Ranges over rows that are not loaded (remote mode) ----
	/** A range waiting for its rows: ids collected as blocks arrive, so eviction cannot lose them. */
	#pendingIds?: { first: number; ids: (string | undefined)[]; left: number; resolve: (ids: string[] | undefined) => void };

	#idOf(row: Row, index: number): string {
		return this.getRowId ? this.getRowId(row, index) : String(index);
	}

	/**
	 * The ids of rows `first..last`. Rows not loaded are requested (`reason: "selection"`), and the
	 * promise resolves once all of them have arrived; it resolves `undefined` if the epoch changes
	 * first, or if another range replaces this one. Ids are never invented.
	 */
	#rowIds(first: number, last: number): Promise<string[] | undefined> {
		const n = this.#rowTotal();
		const lo = Math.max(0, Math.min(first, last));
		const hi = Math.min(n - 1, Math.max(first, last));
		if (hi < lo) return Promise.resolve([]);
		if (!this.#isRemote) {
			const ids: string[] = [];
			for (let i = lo; i <= hi; i++) { const r = this.#rowAt(i); if (r) ids.push(r.id); }
			return Promise.resolve(ids);
		}
		this.#dropPendingIds();
		const ids: (string | undefined)[] = new Array(hi - lo + 1);
		let left = ids.length;
		for (let i = lo; i <= hi; i++) {
			const row = this.#cache.get(i);
			if (row !== undefined) { ids[i - lo] = this.#idOf(row, i); left--; }
		}
		if (!left) return Promise.resolve(ids as string[]);
		return new Promise((resolve) => {
			this.#pendingIds = { first: lo, ids, left, resolve };
			this.#fetchRows(lo, hi, "selection");
		});
	}
	/** Record ids for a pending range from rows just stored; resolve once none are missing. */
	#capture(start: number, rows: Row[]) {
		const p = this.#pendingIds;
		if (!p) return;
		rows.forEach((row, k) => {
			const at = start + k - p.first;
			if (at < 0 || at >= p.ids.length || p.ids[at] !== undefined) return;
			p.ids[at] = this.#idOf(row, start + k);
			p.left--;
		});
		if (p.left === 0) {
			this.#pendingIds = undefined;
			p.resolve(p.ids as string[]);
		}
	}
	#dropPendingIds() {
		const p = this.#pendingIds;
		this.#pendingIds = undefined;
		p?.resolve(undefined);
	}

	/**
	 * Remote mode: drop every cached row and ask again for the rows on screen. Call it when the list
	 * changed in a way inserts and removals cannot describe. Starts a new epoch, so answers to
	 * earlier requests are ignored. `keepScroll: false` also scrolls to the top.
	 */
	resetRows({ keepScroll = true }: { keepScroll?: boolean } = {}) {
		if (!this.#isRemote) return;
		this.#resetCache();
		if (!keepScroll) this.#virtualizer?.scrollToOffset(0);
	}

	/**
	 * Remote mode: `rowsOrCount` rows were added on the server at absolute index `index`. Pass the
	 * new rows to cache them, or a count to show placeholders the grid will request. Cached rows,
	 * `rowCount`, `activeIndex`, and the select plugin's Shift anchor move down with their rows;
	 * selection is by id and does not move. When the insert is above the first visible row, the
	 * view scrolls by the same amount so the rows on screen stay put. Starts a new epoch, so
	 * answers to earlier requests are ignored. Does nothing outside remote mode.
	 */
	insertRows(index: number, rowsOrCount: Row[] | number) {
		if (!this.#isRemote) return;
		const rows = Array.isArray(rowsOrCount) ? rowsOrCount : [];
		const count = Math.max(0, Math.floor(Array.isArray(rowsOrCount) ? rowsOrCount.length : rowsOrCount));
		const n = this.#rowTotal();
		const at = Math.min(n, Math.max(0, Math.floor(index)));
		if (!count) return;
		this.#shift(at, count, n + count, rows);
	}

	/**
	 * Remote mode: rows `index..index + count - 1` were removed on the server. Cached rows after
	 * them, `rowCount`, `activeIndex`, and the select plugin's Shift anchor move up. When the active
	 * row is removed, the row that slides into the first removed slot becomes active (clamped to
	 * the last row); this is silent, like any programmatic `activeIndex` change. Rows removed above
	 * the first visible row scroll the view by the same amount, so the rows on screen stay put.
	 * Starts a new epoch. Does nothing outside remote mode.
	 */
	removeRows(index: number, count: number) {
		if (!this.#isRemote) return;
		const n = this.#rowTotal();
		const at = Math.max(0, Math.floor(index));
		const k = Math.min(Math.max(0, Math.floor(count)), n - at);
		if (k <= 0) return;
		this.#shift(at, -k, n - k);
	}

	/**
	 * Scroll so row `index` is in view. `align` is `"start"`, `"center"`, `"end"`, or `"auto"` (the
	 * default: scroll only as far as needed). In remote mode the index is absolute. Works in both
	 * modes.
	 */
	scrollToIndex(index: number, { align = "auto" }: { align?: "start" | "center" | "end" | "auto" } = {}) {
		this.#virtualizer?.scrollToIndex(index, { align });
	}

	/**
	 * The first and last row (inclusive) inside the viewport, without the overscan rows the grid
	 * also renders. A row partly in view counts. In remote mode the indices are absolute. Both are
	 * -1 when there are no rows. A host can read it before a refresh to keep what the user was
	 * looking at in place.
	 */
	getVisibleRange(): VisibleRange {
		const v = this.#virtualizer;
		const n = this.#rowTotal();
		if (!v || !n) return { first: -1, last: -1 };
		const top = v.scrollOffset ?? this.scrollEl?.scrollTop ?? 0;
		const h = v.scrollRect?.height || this.scrollEl?.clientHeight || 0;
		const first = v.getVirtualItemForOffset(top)?.index ?? 0;
		const last = h > 0 ? (v.getVirtualItemForOffset(top + h - 1)?.index ?? n - 1) : first;
		return { first, last: Math.max(first, Math.min(n - 1, last)) };
	}

	/**
	 * The shared part of an insert (`delta > 0`) or removal (`delta < 0`) at `at`: move the cache,
	 * the active row, and plugin-held indices; set the new count; and keep the rows on screen in
	 * place when the change is above them. `rowCount` is the count after the change.
	 */
	#shift(at: number, delta: number, rowCount: number, inserted: Row[] = []) {
		const removedEnd = delta < 0 ? at - delta : at; // first index after a removed run
		const move = (i: number) => (i >= removedEnd ? i + delta : i >= at && delta < 0 ? -1 : i);
		const first = this.getVisibleRange().first;
		// Rows changed above the first visible row: inserts all count; a removal counts only the
		// rows above it.
		const above = first < 0 || at >= first ? 0 : delta > 0 ? delta : -Math.min(-delta, first - at);

		// Removed rows that were loaded leave the selection (or the deselected set under select all).
		const gone = delta < 0 ? this.#removedIds(at, -delta) : [];
		this.#dropPendingIds();
		this.#cache.shift(at, delta, rowCount);
		if (inserted.length) this.#cache.put(at, inserted, rowCount);
		clearTimeout(this.#settleTimer);
		this.#settleTimer = undefined;
		this.#awaitScroll = false;

		const last = Math.max(0, rowCount - 1);
		const active = move(this.activeIndex);
		this.activeIndex = Math.min(last, active < 0 ? at : active);
		if (this.#pendingActive !== undefined) {
			const p = move(this.#pendingActive);
			this.#pendingActive = p < 0 ? undefined : p;
		}
		if (this.#prevRange) this.#prevRange = { start: move(this.#prevRange.start), end: move(this.#prevRange.end) };
		for (const p of this.#active) p.shiftRows?.(at, delta, this.#ctx);

		this.rowCount = rowCount;
		this.#syncRemoteData();
		const record = this.#tstate.rowSelection ?? {};
		if (gone.some((id) => id in record)) {
			const next = { ...record };
			for (const id of gone) delete next[id];
			this.#setSelection(this.allSelected, next);
		}
		const v = this.#virtualizer;
		v?.setOptions({ ...v.options, count: rowCount });
		if (v && above) {
			// The virtualizer renders from its own offset, so move it now; the element follows in
			// updated(), once the rowgroup has its new height and the browser cannot clamp it.
			const offset = Math.max(0, (v.scrollOffset ?? 0) + above * this.rowHeight);
			v.scrollOffset = offset;
			this.#scrollTo = offset;
		}
	}
	/** Ids of the loaded rows among `at..at + count - 1`. */
	#removedIds(at: number, count: number): string[] {
		const out: string[] = [];
		for (let i = at; i < at + count; i++) {
			const row = this.#cache.get(i);
			if (row !== undefined) out.push(this.#idOf(row, i));
		}
		return out;
	}
	/** A scrollTop for updated() to apply after an index shift. */
	#scrollTo?: number;

	/**
	 * Remote mode, after a sort change: every cached row is in the old order, so drop the cache
	 * (new epoch), go back to the top, and ask for the top rows at once. Until the scroll lands,
	 * the stashed range still names the old position; `#awaitScroll` keeps that stale range from
	 * being requested in the new epoch.
	 */
	#resortRemote() {
		const r = this.#range;
		this.#resetCache();
		this.activeIndex = 0;
		const rows = r && r.start >= 0 ? r.end - r.start + 1 : this.#viewportRows();
		if (r && r.start > 0) this.#awaitScroll = true;
		this.#virtualizer?.scrollToOffset(0);
		this.#fetchRows(0, Math.min(this.#rowTotal(), rows) - 1, "range");
	}

	/** Rebuild TanStack's data from the cache. */
	#syncRemoteData() {
		const { rows, indices } = this.#cache.entries();
		this.#remoteData = rows;
		this.#remoteIdx = indices;
		this.#remotePos = new Map(indices.map((abs, pos) => [abs, pos]));
		this.#table?.setOptions(() => this.#mergedOptions());
		this.requestUpdate();
	}
	#resetCache() {
		clearTimeout(this.#settleTimer);
		this.#settleTimer = undefined;
		this.#pendingActive = undefined;
		this.#awaitScroll = false;
		this.#dropPendingIds();
		this.#cache.clear(this.blockSize);
		this.#syncRemoteData();
	}

	/** Whole rows that fit the scroll viewport (at least 1). */
	#viewportRows(): number {
		const h = this.#virtualizer?.scrollRect?.height || this.scrollEl?.offsetHeight || 0;
		return Math.max(1, Math.floor(h / this.rowHeight));
	}

	/**
	 * Remote mode: request the blocks of the rendered range that are neither cached nor already
	 * requested. Called from updated(), like the range event. A jump of more than one viewport
	 * starts a `settleMs` hold; while it runs, any further movement restarts it, and only when it
	 * expires is the range of that moment requested.
	 */
	#requestRows() {
		const r = this.#range;
		const prev = this.#prevRange;
		this.#prevRange = r && { start: r.start, end: r.end };
		if (!this.#isRemote || !r || r.start < 0) return;
		const moved = !prev || prev.start !== r.start || prev.end !== r.end;
		if (this.#awaitScroll) {
			// The sort already asked for the top rows; the scroll there is ours, so no settle hold.
			if (moved) { this.#awaitScroll = false; this.#fetchRows(r.start, r.end, "range"); }
			return;
		}
		const jump = !!prev && prev.start >= 0 && Math.abs(r.start - prev.start) > this.#viewportRows();
		if (this.settleMs > 0 && (jump || (this.#settleTimer !== undefined && moved))) {
			clearTimeout(this.#settleTimer);
			this.#settleTimer = setTimeout(() => {
				this.#settleTimer = undefined;
				const now = this.#range;
				if (this.isConnected && now && now.start >= 0) this.#fetchRows(now.start, now.end, "range");
			}, this.settleMs);
			return;
		}
		if (this.#settleTimer !== undefined) return;
		this.#fetchRows(r.start, r.end, "range");
	}
	#fetchRows(first: number, last: number, reason: "range" | "selection") {
		const blocks = this.#cache.missing(first, last);
		if (!blocks.length) return;
		const epoch = this.#cache.epoch;
		for (const run of this.#cache.request(blocks, this.#rowTotal())) {
			this.emit("dj-rows-request", { detail: { start: run.start, end: run.end, epoch, reason } });
		}
	}

	/** Column list after every plugin's `columns()` transform, in array order. */
	#computeColumns(): GridColumn[] {
		return this.#active.reduce((cols, p) => p.columns?.(cols, this.#ctx) ?? cols, this.columns);
	}
	#columnDefs(): ColumnDef<Row>[] {
		return this.#computeColumns().map((c) => {
			const def: ColumnDef<Row> = { id: c.id, header: c.header ?? c.id, enableSorting: c.sortable ?? true };
			// A computed column derives its value from the whole row; otherwise key off the field.
			if (c.compute) (def as { accessorFn?: (row: Row) => unknown }).accessorFn = c.compute;
			else (def as { accessorKey?: string }).accessorKey = c.accessorKey ?? c.id;
			// Pass a plugin-set aggregation through to TanStack (groups plugin sets this via columns()).
			if (c.aggregationFn) def.aggregationFn = c.aggregationFn;
			return def;
		});
	}
	// Full state is seeded from table.initialState; a single onStateChange drives everything.
	#onStateChange = (updater: Updater<TableState>) => {
		const prev = this.#tstate;
		this.#tstate = functionalUpdate(updater, this.#tstate);
		this.#table.setOptions((o) => ({ ...o, state: this.#tstate }));
		if (this.#tstate.sorting !== prev.sorting) {
			this.sorting = this.#tstate.sorting;
			this.emit("dj-sort", { detail: { sorting: this.sorting } });
			if (this.#isRemote) this.#resortRemote();
		}
		if (this.#tstate.rowSelection !== prev.rowSelection) {
			this.rowSelection = this.#tstate.rowSelection;
			this.emit("dj-selection-change", { detail: this.#selectionDetail() });
		}
		// Row count changes with filter/pagination/expansion plugins; keep the virtualizer in sync
		// or it renders a stale row window.
		this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#rowTotal() });
		this.requestUpdate();
	};

	/** Core TanStack options (no state/onStateChange — those are applied last, after plugins). */
	#coreOptions(): TableOptionsResolved<Row> {
		return {
			data: this.#isRemote ? this.#remoteData : this.data,
			columns: this.#columnDefs(),
			state: {},
			onStateChange: this.#onStateChange,
			enableRowSelection: this.selectionMode !== "none",
			enableMultiRowSelection: this.selectionMode === "multiple",
			getRowId: this.#rowIdFn(),
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
			// Remote mode: the host sorts. TanStack only tracks `sorting` for the headers.
			manualSorting: this.#isRemote,
			renderFallbackValue: null,
		};
	}
	/** Row ids. In remote mode TanStack only sees the cached rows, so the index it passes is a
	 *  cache position; translate it to the absolute index before anything sees it. */
	#rowIdFn(): ((row: Row, index: number) => string) | undefined {
		if (!this.#isRemote) return this.getRowId;
		const own = this.getRowId;
		if (own) return (row, i) => own(row, this.#remoteIdx[i]);
		if (!this.#warnedRowId) {
			this.#warnedRowId = true;
			console.warn("dj-data-grid: remote mode (rowCount) needs getRowId; selection falls back to absolute row indices.");
		}
		return (_row, i) => String(this.#remoteIdx[i]);
	}
	/** Core options spread with each plugin's tableOptions() in array order (later wins), then
	 *  core's state/onStateChange applied LAST so a plugin can never clobber them. */
	#mergedOptions(): TableOptionsResolved<Row> {
		let opts = this.#coreOptions();
		for (const p of this.#active) {
			const extra = p.tableOptions?.();
			if (extra) opts = { ...opts, ...extra };
		}
		return { ...opts, state: this.#tstate ?? {}, onStateChange: this.#onStateChange };
	}

	/** (Re)build the table: dispose prior setups, recreate, seed state, run plugin setups.
	 *  Called at connect and whenever `plugins` genuinely changes. */
	#buildTable() {
		for (const d of this.#disposers) d();
		this.#disposers = [];
		this.#pickPlugins();

		this.#table = createTable(this.#mergedOptions());
		// The FULL initialState spread is load-bearing: a partial TanStack `state` crashes on an
		// undefined slice (row models read state.pagination/grouping/expanded/columnFilters). This
		// also picks up any initialState a plugin contributed via tableOptions().
		this.#tstate = { ...this.#table.initialState, sorting: this.sorting, rowSelection: this.rowSelection };
		this.#table.setOptions((o) => ({ ...o, state: this.#tstate }));

		for (const p of this.#active) {
			const dispose = p.setup?.(this.#ctx);
			if (dispose) this.#disposers.push(dispose);
		}
		this.#builtPlugins = this.plugins;
		this.#builtRemote = this.#isRemote;
		this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#rowTotal() });
	}

	protected override willUpdate(changed: Map<PropertyKey, unknown>) {
		super.willUpdate(changed);
		// Rebuild BEFORE render whenever the plugin array is not the one the table was built with.
		// Row models and setup() only exist at table creation, so a missed rebuild silently drops
		// plugin behavior (this bit the playground: plugins assigned right after the upgrading
		// import, inside the first update cycle).
		if (this.#table && (this.plugins !== this.#builtPlugins || this.#isRemote !== this.#builtRemote)) {
			this.#buildTable();
			this.#virtualizer?.measure();
		}
	}

	#onBeforePrint = () => { this.printing = true; };
	#onAfterPrint = () => { this.printing = false; };

	override connectedCallback() {
		super.connectedCallback();
		this.#buildTable();
		window.addEventListener("beforeprint", this.#onBeforePrint);
		window.addEventListener("afterprint", this.#onAfterPrint);
	}
	override disconnectedCallback() {
		super.disconnectedCallback();
		for (const d of this.#disposers) d();
		this.#disposers = [];
		this.#cleanup?.();
		clearTimeout(this.#settleTimer);
		this.#settleTimer = undefined;
		window.removeEventListener("beforeprint", this.#onBeforePrint);
		window.removeEventListener("afterprint", this.#onAfterPrint);
	}

	protected override firstUpdated() {
		this.#virtualizer = new Virtualizer({
			count: this.#rowTotal(),
			getScrollElement: () => this.scrollEl,
			estimateSize: () => this.rowHeight,
			overscan: 8,
			scrollToFn: elementScroll,
			observeElementRect,
			observeElementOffset,
			// Used only when a renderDetail plugin switches rows to measured wrappers. Falls back to
			// the row-height estimate when layout reports no size (headless test DOM).
			measureElement: (el) => {
				const h = (el as HTMLElement).getBoundingClientRect?.().height ?? 0;
				return h > 0 ? h : this.rowHeight;
			},
			onChange: () => this.requestUpdate(),
		});
		this.#cleanup = this.#virtualizer._didMount();
		this.requestUpdate();
	}
	protected override updated(c: Map<PropertyKey, unknown>) {
		// Plugins-change rebuilds happen in willUpdate (reference compare against #builtPlugins),
		// which is immune to the upgrade-order race a changedProperties guard has here.
		// Entering or leaving remote mode, or a new block size, starts the cache over.
		const wasRemote = c.has("rowCount") ? Number.isFinite(c.get("rowCount")) : this.#isRemote;
		if (wasRemote !== this.#isRemote || (c.has("blockSize") && this.#isRemote)) this.#resetCache();
		if (c.has("data") || c.has("columns") || c.has("selectionMode") || c.has("rowCount")) {
			this.#table.setOptions(() => this.#mergedOptions());
			this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#rowTotal() });
			this.#virtualizer?.measure();
			this.requestUpdate();
		}
		if (this.#scrollTo !== undefined && this.scrollEl) {
			this.scrollEl.scrollTop = this.#scrollTo;
			this.#scrollTo = undefined;
		}
		this.#emitRangeChange();
		this.#requestRows();
	}

	/**
	 * Emit `dj-range-change` when the rendered window moved. Called from `updated()`, never from
	 * `render()` — see `#range`. The requestUpdate() calls above schedule another cycle whose own
	 * updated() emits the settled range, so an early return here costs nothing.
	 */
	#emitRangeChange() {
		const r = this.#range;
		if (!r) return;
		const prev = this.#emittedRange;
		if (prev && prev.start === r.start && prev.end === r.end && prev.count === r.count) return;
		this.#emittedRange = { start: r.start, end: r.end, count: r.count };
		this.emit("dj-range-change", { detail: { start: r.start, end: r.end, count: r.count, rendered: r.rendered } });
	}

	/** Move the active row on a user gesture and announce it. Programmatic `activeIndex`
	 *  assignments bypass this on purpose, so they stay silent. */
	#setActive(index: number) {
		this.headerCol = null;
		if (index === this.activeIndex) return;
		this.activeIndex = index;
		const row = this.#rowAt(index);
		// A placeholder: announce now, and again with the row when its block lands (setRows).
		this.#pendingActive = this.#isRemote && !row ? index : undefined;
		this.emit("dj-active-change", { detail: { index, row: row?.original } });
	}
	private move(delta: number) {
		const n = this.#rowTotal();
		if (!n) return;
		this.#setActive(Math.min(n - 1, Math.max(0, this.activeIndex + delta)));
		this.#virtualizer?.scrollToIndex(this.activeIndex, { align: "auto" });
	}
	private onKeyDown(e: KeyboardEvent) {
		// Keys typed into a filter input (or any text control in the grid) belong to that control.
		if (isTextEntryTarget(e)) return;
		if (this.headerCol !== null) { this.#onHeaderKey(e); return; }
		const n = this.#rowTotal();
		switch (e.key) {
			case "ArrowDown": e.preventDefault(); this.move(1); break;
			case "ArrowUp":
				e.preventDefault();
				if (this.activeIndex <= 0 && this.#headers().length) this.headerCol = 0;
				else this.move(-1);
				break;
			case "PageDown": e.preventDefault(); this.move(this.#viewportRows()); break;
			case "PageUp": e.preventDefault(); this.move(-this.#viewportRows()); break;
			case "Home": e.preventDefault(); if (n) this.#setActive(0); this.#virtualizer?.scrollToIndex(0); break;
			case "End": e.preventDefault(); if (n) this.#setActive(n - 1); this.#virtualizer?.scrollToIndex(n - 1); break;
			// Platform convention (and the ARIA grid pattern): Enter activates, Space selects.
			// Under `activation="none"` both keep toggling, so nothing existing moves.
			case " ": e.preventDefault(); this.toggleAt(this.activeIndex); break;
			case "Enter":
				e.preventDefault();
				if (this.activation === "none") this.toggleAt(this.activeIndex);
				else this.activateAt(this.activeIndex);
				break;
		}
	}
	/** Keys while the position is on the header row: Left/Right (mirrored in RTL), Home/End move
	 *  between headers, Enter/Space sort a sortable one, ArrowDown returns to row 0. */
	#onHeaderKey(e: KeyboardEvent) {
		const headers = this.#headers();
		const last = headers.length - 1;
		const col = Math.min(this.headerCol ?? 0, last);
		const rtl = getComputedStyle(this).direction === "rtl";
		const go = (i: number) => { e.preventDefault(); this.headerCol = Math.max(0, Math.min(last, i)); };
		switch (e.key) {
			case "ArrowLeft": go(col + (rtl ? 1 : -1)); break;
			case "ArrowRight": go(col + (rtl ? -1 : 1)); break;
			case "Home": go(0); break;
			case "End": go(last); break;
			case "ArrowUp": e.preventDefault(); break;
			case "ArrowDown":
				e.preventDefault();
				this.headerCol = null;
				if (this.#rowTotal()) { this.#setActive(0); this.#virtualizer?.scrollToIndex(0); }
				break;
			case "Enter":
			case " ": {
				e.preventDefault();
				const column = headers[col]?.column;
				if (column?.getCanSort()) column.toggleSorting();
				break;
			}
		}
	}

	#headers(): TableHeader<Row, unknown>[] {
		return this.#table?.getHeaderGroups()[0]?.headers ?? [];
	}

	toggleAt(index: number) {
		if (this.selectionMode === "none") return;
		this.#rowAt(index)?.toggleSelected();
	}

	/**
	 * Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only
	 * list with clickable rows is a real case) but never under `activation="none"`.
	 */
	activateAt(index: number) {
		if (this.activation === "none") return;
		const row = this.#rowAt(index);
		if (!row) return;
		this.emit("dj-activate", { detail: { row: row.original, index } });
	}

	/**
	 * A row's pointer gesture. Modified clicks are RESERVED for selection and never activate:
	 * activating a row while the user is building a selection is the surprise this design removes.
	 */
	#onRowClick(e: MouseEvent, index: number) {
		// A plugin may claim the gesture (the select plugin owns Shift ranges). Ask before the
		// cursor moves, so the plugin can still see where it was.
		let claimed = false;
		for (const p of this.#active) if (p.rowClick?.(e, index, this.#ctx) === true) { claimed = true; break; }
		this.#setActive(index);
		if (claimed) return;
		if (this.activation === "none") { this.toggleAt(index); return; }
		// Ctrl/Cmd toggles this row; Shift is the range gesture (owned by the select plugin).
		if (e.ctrlKey || e.metaKey) { this.toggleAt(index); return; }
		if (e.shiftKey) return;
		if (this.activation === "click") this.activateAt(index);
		// `"double"`: a plain click only moves the active row; `dblclick` activates.
	}

	/** `"double"` mode only. Uses the platform's own dblclick rather than a hand-rolled timer,
	 *  so the two `click` events a double click also produces can never activate. */
	#onRowDblClick(e: MouseEvent, index: number) {
		if (this.activation !== "double") return;
		if (e.ctrlKey || e.metaKey || e.shiftKey) return;
		this.activateAt(index);
	}

	/** A cell's content: the first plugin `renderCell` that returns non-undefined wins (else the
	 *  core string default), then every `decorateCell` folds over it in array order. */
	/** Merge every plugin's row attributes for a row (array order, later wins), then fold the
	 *  core's own state parts into `part`. A plugin's `part` tokens are kept, never replaced, so
	 *  `row--active` and `row--selected` survive alongside a rowstate plugin's `row--unread`. */
	#rowAttributes(row: TableRow<Row>, index: number, selected: boolean): Record<string, string> {
		let attrs: Record<string, string> = {};
		for (const p of this.#active) if (p.rowAttributes) attrs = { ...attrs, ...p.rowAttributes(row, this.#ctx) };
		const parts = new Set(["row", ...(attrs.part ?? "").split(/\s+/).filter(Boolean)]);
		if (index === this.activeIndex) parts.add("row--active");
		if (selected) parts.add("row--selected");
		return { ...attrs, part: [...parts].join(" ") };
	}

	#cellContent(cell: Cell<Row, unknown>): unknown {
		let content: unknown = undefined;
		for (const p of this.#active) {
			const r = p.renderCell?.(cell, this.#ctx);
			if (r !== undefined) { content = r; break; }
		}
		if (content === undefined) content = String(cell.getValue() ?? "");
		for (const p of this.#active) if (p.decorateCell) content = p.decorateCell(cell, content, this.#ctx);
		return content;
	}

	/** A header cell's content: the first plugin `renderHeader` returning non-undefined wins, else
	 *  the core default (the column's `header` string, falling back to its id). Mirrors
	 *  `#cellContent` so a plugin owning a column can also own that column's header control. */
	#headerContent(header: TableHeader<Row, unknown>): unknown {
		for (const p of this.#active) {
			const r = p.renderHeader?.(header, this.#ctx);
			if (r !== undefined) return r;
		}
		const def = header.column.columnDef.header;
		return typeof def === "string" ? def : header.column.id;
	}

	/** Detail content for a row: the first plugin `renderDetail` returning non-undefined wins. */
	#detailContent(row: TableRow<Row>): TemplateResult | undefined {
		for (const p of this.#active) {
			const d = p.renderDetail?.(row, this.#ctx);
			if (d !== undefined) return d;
		}
		return undefined;
	}

	override render() {
		const headers = this.#headers();
		const hasDetail = this.#active.some((p) => p.renderDetail);
		this.#virtualizer?._willUpdate();
		const virtualItems = this.#virtualizer?.getVirtualItems() ?? [];
		const rows = this.#table?.getRowModel().rows ?? [];
		const remote = this.#isRemote;
		const n = this.#rowTotal();
		// Stash the rendered range for updated() to emit, from the REAL virtualizer window regardless
		// of printing — a consumer's end-reached windowing logic (dj-range-change) must not see the
		// whole list as "rendered" just because a print materialized it.
		const rendered = virtualItems.map((vi) => vi.index);
		this.#range = {
			start: rendered.length ? rendered[0] : -1,
			end: rendered.length ? rendered[rendered.length - 1] : -1,
			count: n,
			rendered,
		};
		// Printing (plain row path only) shows a real <table>/<thead>/<tbody> ALONGSIDE the normal
		// grid instead of replacing it — see the `<table part="grid" class="print-table">` near the
		// end of this template. A genuine HTML <thead> repeats across printed pages natively in every
		// major engine; an earlier version tried to fake that with CSS (`display: table-header-group`
		// on a div, relying on the "anonymous table" fix-up rules) and it did not reliably repeat in
		// practice, confirmed against a real print preview (Bill, 2026-08-18). Two more real bugs
		// shipped and got fixed the same day, both from a version that returned the print table IN
		// PLACE OF the whole template rather than alongside it:
		//  1. That unmounted `.scroll` — the element the TanStack virtualizer's ResizeObserver/scroll
		//     listeners were attached to in firstUpdated() — and the grid came back permanently empty
		//     once printing ended, because the virtualizer never recovered once its tracked element
		//     was destroyed. Hiding `.wrap` via `display:none` instead keeps `.scroll` mounted and
		//     observed the whole time; the observers just report a zero-size rect while hidden and a
		//     real one again once printing ends.
		//  2. The print table was nested inside `.wrap` (display:flex), and a flex-item table doesn't
		//     get a browser's native repeating-thead print behavior. It has to be a sibling, not a
		//     descendant — see the template below.
		// The print table is also ALWAYS in the DOM (empty + hidden off-print, not conditionally
		// added/removed) with its markup INLINED directly in this template rather than factored into
		// a helper method returning its own separate `html` call — both of those matter only for a
		// lit-html + happy-dom quirk in this workspace's unit-test harness (bisected against a minimal
		// reproduction, 2026-08-18): a nested TemplateResult returned from a separate function/method
		// call, sitting in the trailing child position of an outer template, silently fails to commit
		// — regardless of whether it's conditional. The identical markup written inline, or toggled by
		// CONTENT within an always-present element, does not trigger it. A real browser was unaffected
		// either way, but this shape costs nothing extra on screen and is what the unit tests exercise.
		const printing = this.printing && !hasDetail;

		// `minmax(0, 1fr)`, not `1fr` (= `minmax(auto, 1fr)`): the header, each subheader,
		// and each body row are separate grid containers, so an `auto` minimum would let a
		// row with wide content (e.g. a native <select> filter) grow its tracks independently
		// and drift out of alignment with the header. A 0 minimum makes every row resolve the
		// same track widths; cells ellipsize.
		const template = this.#computeColumns().map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
		const total = this.#virtualizer?.getTotalSize() ?? 0;
		const items = virtualItems;
		// Chrome regions (quick filter, pagination, totals) are full-width, outside the grid rows.
		const chromeTops = this.#active.map((p) => p.chromeTop?.(this.#ctx)).filter((x) => x !== undefined);
		const chromeBottoms = this.#active.map((p) => p.chromeBottom?.(this.#ctx)).filter((x) => x !== undefined);
		// Each plugin that returns subheaderCells contributes one extra header-area row.
		const subRows = this.#active.map((p) => p.subheaderCells?.(this.#ctx)).filter((x): x is Array<TemplateResult | null> => x !== undefined);
		const headerRows = 1 + subRows.length;
		// aria-activedescendant must point at a rendered row; with virtualization the active row can
		// be scrolled out of the rendered window, so omit it then.
		const activeRendered = virtualItems.some((vi) => vi.index === this.activeIndex);
		const headerCol = this.headerCol === null || !headers.length ? null : Math.min(this.headerCol, headers.length - 1);
		const activeId = headerCol !== null ? `h-${headerCol}` : n && activeRendered ? `r-${this.activeIndex}` : nothing;
		return html`
			<div class="wrap" style=${printing ? "display:none" : nothing}>
				${chromeTops.map((c) => html`<div part="chrome-top" class="chrome">${c}</div>`)}
				<div part="grid" class="grid" role="grid" tabindex="0" aria-rowcount=${n + headerRows} aria-colcount=${headers.length} aria-multiselectable=${this.selectionMode === "multiple" ? "true" : nothing} aria-activedescendant=${activeId} @keydown=${this.onKeyDown}>
					<div part="head" class="head row" role="row" aria-rowindex="1" style=${`grid-template-columns:${template}`}>
						${headers.map((h, i) => {
							const sortable = h.column.getCanSort();
							const dir = h.column.getIsSorted();
							const label = this.#headerContent(h);
							// APG sortable table: a real button names and operates the sort, aria-sort sits on
							// the columnheader, and the glyph is hidden. The button is not a tab stop; the grid
							// stays one, and the keyboard reaches headers with ArrowUp from row 0. A column that
							// cannot sort gets no button, so a plugin control (select-all) is never nested in one. The
							// click handler stays on the cell, so a click anywhere in it (or on the button) sorts.
							const glyph = html`<span class="sortind" aria-hidden="true">${dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}</span>`;
							return html`<div id=${`h-${i}`} class="hcell ${sortable ? "sortable" : ""} ${i === headerCol ? "hcell--active" : ""}" role="columnheader"
								aria-colindex=${i + 1}
								aria-sort=${dir === "asc" ? "ascending" : dir === "desc" ? "descending" : nothing}
								@click=${sortable ? () => h.column.toggleSorting() : nothing}>
								${sortable
									? html`<button part="sort-button" class="sortbtn" type="button" tabindex="-1"><span class="label">${label}</span>${glyph}</button>`
									: html`<span class="label">${label}</span>`}
							</div>`;
						})}
					</div>
					${subRows.map((cells, i) => html`<div part="subhead" class="subhead row" role="row" aria-rowindex=${i + 2} style=${`grid-template-columns:${template}`}>
						${cells.map((cell, i) => html`<div class="subcell" role="gridcell" aria-colindex=${i + 1}>${cell ?? nothing}</div>`)}
					</div>`)}
					<div class="scroll" role="presentation" style=${`height:${this.height}`}>
						<div role="rowgroup" style=${`height:${total}px;position:relative`}>
							${items.map((vi) => {
								const row = remote ? this.#rowAt(vi.index) : rows[vi.index];
								if (!row && remote) {
									// Not loaded yet: a real row with a real index, but no data to give plugins.
									const active = vi.index === this.activeIndex;
									return html`<div id=${`r-${vi.index}`}
										class="vrow vrow--placeholder ${active ? "vrow--active" : ""}"
										part=${active ? "row row--placeholder row--active" : "row row--placeholder"}
										role="row" aria-rowindex=${vi.index + headerRows + 1} aria-busy="true"
										style=${`transform:translateY(${vi.start}px);height:${vi.size}px;grid-template-columns:${template}`}
										@click=${() => this.#setActive(vi.index)}>
										${headers.map((_, i) => html`<div part="cell" class="cell" role="gridcell" aria-colindex=${i + 1}><span class="ph"></span></div>`)}
									</div>`;
								}
								if (!row) return nothing;
								const selected = this.#isSelected(row);
								// With a renderDetail plugin, rows have variable height: each virtual item
								// becomes a measured wrapper (data-index + measureElement ref, the TanStack
								// dynamic-size contract) holding the fixed-height row plus its detail panel.
								// (Printing with a detail plugin also lands here, unmaterialized — see
								// #renderPrintTable for why only the plain row path gets a print template.)
								const rowStyle = hasDetail
									? `position:static;height:${this.rowHeight}px;grid-template-columns:${template}`
									: `transform:translateY(${vi.start}px);height:${vi.size}px;grid-template-columns:${template}`;
								const rowTpl = html`<div id=${`r-${vi.index}`}
									class="vrow ${vi.index === this.activeIndex ? "vrow--active" : ""} ${selected ? "vrow--selected" : ""}"
									role="row" aria-rowindex=${vi.index + headerRows + 1} aria-selected=${this.selectionMode !== "none" ? (selected ? "true" : "false") : nothing}
									style=${rowStyle}
									${ref((el) => el && applyRowAttrs(el as Element, this.#rowAttributes(row, vi.index, selected)))}
									@click=${(e: MouseEvent) => this.#onRowClick(e, vi.index)}
									@dblclick=${(e: MouseEvent) => this.#onRowDblClick(e, vi.index)}>
									${row.getVisibleCells().map((cell, i) => html`<div part="cell" class="cell" role="gridcell" aria-colindex=${i + 1}>${this.#cellContent(cell)}</div>`)}
								</div>`;
								if (!hasDetail) return rowTpl;
								const detail = this.#detailContent(row);
								return html`<div class="vwrap" data-index=${vi.index}
									style=${`transform:translateY(${vi.start}px)`}
									${ref((el) => { if (el) this.#virtualizer?.measureElement(el as HTMLElement); })}>
									${rowTpl}
									${detail !== undefined
										? html`<div class="vdetail" role="row"><div part="detail" class="detail" role="gridcell" aria-colindex="1" aria-colspan=${headers.length}>${detail}</div></div>`
										: nothing}
								</div>`;
							})}
						</div>
					</div>
				</div>
				${chromeBottoms.map((c) => html`<div part="chrome-bottom" class="chrome">${c}</div>`)}
			</div>
			<table part="grid" class="print-table" style=${printing ? nothing : "display:none"}>
				<thead>
					<tr part="head">${printing ? headers.map((h) => html`<th part="cell">${this.#headerContent(h)}</th>`) : ""}</tr>
				</thead>
				<tbody>
					${printing ? rows.map((row, index) => html`<tr part="row" id=${`r-${remote ? this.#indexOf(row) : index}`}>${row.getVisibleCells().map((cell) => html`<td part="cell">${this.#cellContent(cell)}</td>`)}</tr>`) : ""}
				</tbody>
			</table>
		`;
	}
}
export default DjDataGrid;
declare global {
	interface GlobalEventHandlersEventMap {
		"dj-sort": CustomEvent<{ sorting: SortingState }>;
		"dj-selection-change": CustomEvent<GridSelection & { rows: Row[] }>;
		"dj-activate": CustomEvent<{ row: Row; index: number }>;
		"dj-active-change": CustomEvent<{ index: number; row: Row | undefined }>;
		"dj-range-change": CustomEvent<{ start: number; end: number; count: number; rendered: number[] }>;
		"dj-rows-request": CustomEvent<{ start: number; end: number; epoch: number; reason: "range" | "selection" }>;
	}
}
