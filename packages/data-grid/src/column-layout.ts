/**
 * Column state and layout math for `dj-data-grid`. Pure functions, no DOM, so the order, width,
 * and sticky-offset rules are testable without layout.
 */

/** A column's width as the user (or the app) set it, the order, the pinned groups, and which
 *  columns are hidden. From `grid.columnState` and `dj-column-state-change`. */
export interface GridColumnState {
	/** Pixel widths by column id. A column with no entry keeps its declared `width`. */
	sizing: Record<string, number>;
	/** Every column id in display order, hidden ones included. */
	order: string[];
	/** Columns pinned to the inline start and end, each in display order. */
	pinning: { start: string[]; end: string[] };
	/** `false` hides a column. A column with no entry is visible. */
	visibility: Record<string, boolean>;
}

/** The slice of a GridColumn the layout reads. */
export interface LayoutColumn {
	id: string;
	width?: string;
	minWidth?: number;
	maxWidth?: number;
	pinned?: "start" | "end";
}

/** The grid's default track: a 0 minimum keeps every row's tracks identical (see render()). */
export const DEFAULT_TRACK = "minmax(0, 1fr)";
/** The width a pinned column gets when it has no fixed width and has not been measured yet. */
export const PINNED_FALLBACK = 150;

/** A track that is one fixed length (px, rem, calc of lengths), not a flexible or keyword one. */
export function isFixedLength(width: string | undefined): boolean {
	if (!width || !width.trim()) return false;
	return !/(fr\b|%|auto|content|minmax|repeat|min\(|max\(|clamp)/.test(width);
}

function clamp(px: number, col: LayoutColumn | undefined): number {
	let v = px;
	if (col?.minWidth !== undefined) v = Math.max(v, col.minWidth);
	if (col?.maxWidth !== undefined) v = Math.min(v, col.maxWidth);
	return Math.round(v);
}

/**
 * Merge a saved order into the declared one. Saved ids the grid no longer has are dropped. A
 * declared id the saved order lacks goes back at its declared place: right after the nearest
 * declared column before it that is placed, or first if there is none.
 */
export function mergeOrder(declared: string[], saved: readonly string[] | undefined): string[] {
	const known = new Set(declared);
	const out: string[] = [];
	for (const id of saved ?? []) if (known.has(id) && !out.includes(id)) out.push(id);
	declared.forEach((id, i) => {
		if (out.includes(id)) return;
		let at = 0;
		for (let j = i - 1; j >= 0; j--) {
			const k = out.indexOf(declared[j]);
			if (k >= 0) { at = k + 1; break; }
		}
		out.splice(at, 0, id);
	});
	return out;
}

/** The state a grid starts with: declared order, declared `pinned`, nothing sized or hidden. */
export function defaultColumnState(cols: readonly LayoutColumn[]): GridColumnState {
	return resolveColumnState(cols, undefined);
}

/**
 * Normalize any state (saved, partial, or none) against the columns the grid has now. Unknown
 * ids are dropped everywhere, missing columns return at their declared place, widths are clamped
 * to `minWidth`/`maxWidth`, pinned groups follow the order, and the order is regrouped so pinned
 * start columns come first and pinned end columns last. A missing `pinning` falls back to the
 * columns' declared `pinned`. `userIds`, when given, are the app's own columns: at least one of
 * them always stays visible.
 */
export function resolveColumnState(
	cols: readonly LayoutColumn[],
	saved: Partial<GridColumnState> | undefined,
	userIds?: ReadonlySet<string>,
): GridColumnState {
	const byId = new Map(cols.map((c) => [c.id, c]));
	const known = (id: string) => byId.has(id);
	const order = mergeOrder(cols.map((c) => c.id), saved?.order);

	const start = new Set<string>();
	const end = new Set<string>();
	if (saved?.pinning) {
		for (const id of saved.pinning.start ?? []) if (known(id)) start.add(id);
		for (const id of saved.pinning.end ?? []) if (known(id) && !start.has(id)) end.add(id);
	} else {
		for (const c of cols) {
			if (c.pinned === "start") start.add(c.id);
			else if (c.pinned === "end") end.add(c.id);
		}
	}
	const group = (id: string) => (start.has(id) ? 0 : end.has(id) ? 2 : 1);
	// Stable: within a group the merged order holds.
	const grouped = order.map((id, i) => ({ id, i })).sort((a, b) => group(a.id) - group(b.id) || a.i - b.i).map((x) => x.id);

	const sizing: Record<string, number> = {};
	for (const [id, px] of Object.entries(saved?.sizing ?? {})) {
		if (known(id) && typeof px === "number" && Number.isFinite(px) && px > 0) sizing[id] = clamp(px, byId.get(id));
	}
	const visibility: Record<string, boolean> = {};
	for (const [id, v] of Object.entries(saved?.visibility ?? {})) {
		if (known(id) && v === false) visibility[id] = false;
	}
	if (userIds && userIds.size) {
		const users = grouped.filter((id) => userIds.has(id));
		if (users.length && users.every((id) => visibility[id] === false)) delete visibility[users[0]];
	}
	return {
		sizing,
		order: grouped,
		pinning: { start: grouped.filter((id) => start.has(id)), end: grouped.filter((id) => end.has(id)) },
		visibility,
	};
}

/** Whether two states are the same (order-sensitive where order matters). */
export function sameColumnState(a: GridColumnState, b: GridColumnState): boolean {
	const eqList = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
	const eqRec = (x: Record<string, unknown>, y: Record<string, unknown>) => {
		const kx = Object.keys(x), ky = Object.keys(y);
		return kx.length === ky.length && kx.every((k) => x[k] === y[k]);
	};
	return eqList(a.order, b.order) && eqList(a.pinning.start, b.pinning.start) && eqList(a.pinning.end, b.pinning.end)
		&& eqRec(a.sizing, b.sizing) && eqRec(a.visibility, b.visibility);
}

/** One visible column as the grid draws it. */
export interface LaidOutColumn {
	id: string;
	/** The CSS grid track. */
	track: string;
	/** Which pinned group it belongs to, or null. */
	pinned: "start" | "end" | null;
	/** The sticky `inset-inline-start` (start group) or `inset-inline-end` (end group), or null
	 *  when the column is not pinned or its offset cannot be known yet. */
	offset: string | null;
	/** The innermost column of its pinned group, which draws the edge shadow. */
	edge: boolean;
	/** Pinned in the state but drawn unpinned, because a width it needs is not known yet. */
	pending: boolean;
}

export interface ColumnLayout {
	columns: LaidOutColumn[];
	/** `grid-template-columns` for every row. */
	template: string;
	/** The narrowest every row may get before the grid scrolls sideways, or "" for no floor. */
	minWidth: string;
	/** TanStack's `columnOrder`, `columnPinning`, and `columnVisibility` for this layout. */
	tanstack: { columnOrder: string[]; columnPinning: { left: string[]; right: string[] }; columnVisibility: Record<string, boolean>; columnSizing: Record<string, number> };
}

/** Sum CSS lengths: plain px values add up, anything else is kept inside a calc(). */
export function sumLengths(lengths: string[]): string {
	let px = 0;
	const rest: string[] = [];
	for (const l of lengths) {
		const m = /^\s*(-?\d+(?:\.\d+)?)px\s*$/.exec(l);
		if (m) px += Number(m[1]);
		else rest.push(l);
	}
	if (!rest.length) return `${px}px`;
	return `calc(${[...(px ? [`${px}px`] : []), ...rest].join(" + ")})`;
}

/**
 * Lay the columns out from a resolved state. `cols` is the full column list after every plugin's
 * `columns()` hook, in declared order. `userIds` are the app's own columns: a plugin column that
 * sits before every app column (the checkbox, the drag handle) joins the start group whenever
 * that group is not empty, so it stays at the far start; one after every app column joins a
 * non-empty end group. `measured` holds pixel widths read from the page for pinned columns with
 * a flexible track; a pinned column that is neither fixed nor measured is drawn unpinned until
 * it has been measured.
 */
export function layoutColumns(
	cols: readonly LayoutColumn[],
	state: GridColumnState,
	userIds: ReadonlySet<string>,
	measured: Readonly<Record<string, number>> = {},
): ColumnLayout {
	const byId = new Map(cols.map((c) => [c.id, c]));
	const declared = cols.map((c) => c.id);
	const firstUser = declared.findIndex((id) => userIds.has(id));
	let lastUser = -1;
	declared.forEach((id, i) => { if (userIds.has(id)) lastUser = i; });
	const leading = new Set(firstUser < 0 ? [] : declared.slice(0, firstUser));
	const trailing = new Set(lastUser < 0 ? [] : declared.slice(lastUser + 1));

	const start = new Set(state.pinning.start);
	const end = new Set(state.pinning.end);
	if (start.size) for (const id of leading) if (!end.has(id)) start.add(id);
	if (end.size) for (const id of trailing) if (!start.has(id)) end.add(id);
	const group = (id: string) => (start.has(id) ? 0 : end.has(id) ? 2 : 1);
	// Leading plugin columns always come first in their group, and trailing ones last, wherever
	// the saved order put them: the user cannot move them, so they never drift.
	const rank = (id: string) => (leading.has(id) ? -1 : trailing.has(id) ? 1 : 0);
	const order = state.order.map((id, i) => ({ id, i }))
		.sort((a, b) => group(a.id) - group(b.id) || rank(a.id) - rank(b.id) || a.i - b.i)
		.map((x) => x.id);

	const visible = order.filter((id) => state.visibility[id] !== false && byId.has(id));
	const fixedOf = (id: string): string | null => {
		const c = byId.get(id)!;
		const px = state.sizing[id];
		if (px !== undefined) return `${px}px`;
		if (isFixedLength(c.width)) return c.width!.trim();
		if (group(id) !== 1 && measured[id] !== undefined) return `${Math.round(measured[id])}px`;
		return null;
	};
	const flexTrack = (c: LayoutColumn) => c.width ?? (c.minWidth !== undefined ? `minmax(${c.minWidth}px, 1fr)` : DEFAULT_TRACK);

	const columns: LaidOutColumn[] = visible.map((id) => {
		const c = byId.get(id)!;
		const fixed = fixedOf(id);
		const g = group(id);
		return { id, track: fixed ?? flexTrack(c), pinned: g === 0 ? "start" : g === 2 ? "end" : null, offset: null, edge: false, pending: false };
	});

	// Start offsets accumulate from the start; a column whose predecessors are not all fixed
	// cannot be placed, and neither can anything after it.
	let acc: string[] = [];
	let ok = true;
	for (const col of columns) {
		if (col.pinned !== "start") continue;
		const w = fixedOf(col.id);
		if (!ok || w === null) { ok = false; col.pinned = null; col.pending = true; continue; }
		col.offset = sumLengths(acc.length ? acc : ["0px"]);
		acc = [...acc, w];
	}
	acc = [];
	ok = true;
	for (let i = columns.length - 1; i >= 0; i--) {
		const col = columns[i];
		if (col.pinned !== "end") continue;
		const w = fixedOf(col.id);
		if (!ok || w === null) { ok = false; col.pinned = null; col.pending = true; continue; }
		col.offset = sumLengths(acc.length ? acc : ["0px"]);
		acc = [...acc, w];
	}
	const lastStart = [...columns].reverse().find((c) => c.pinned === "start");
	const firstEnd = columns.find((c) => c.pinned === "end");
	if (lastStart) lastStart.edge = true;
	if (firstEnd) firstEnd.edge = true;

	// The row floor: every fixed track, plus each flexible track's minimum.
	const floor: string[] = [];
	for (const col of columns) {
		const fixed = fixedOf(col.id);
		const c = byId.get(col.id)!;
		if (fixed) floor.push(fixed);
		else if (c.minWidth !== undefined && c.width === undefined) floor.push(`${c.minWidth}px`);
	}
	const minWidth = floor.length ? sumLengths(floor) : "";

	return {
		columns,
		template: columns.map((c) => c.track).join(" "),
		minWidth: minWidth === "0px" ? "" : minWidth,
		tanstack: {
			columnOrder: order,
			columnPinning: { left: order.filter((id) => group(id) === 0), right: order.filter((id) => group(id) === 2) },
			columnVisibility: Object.fromEntries(order.map((id) => [id, state.visibility[id] !== false])),
			columnSizing: { ...state.sizing },
		},
	};
}
