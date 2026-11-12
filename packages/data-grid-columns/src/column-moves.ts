/**
 * Pure column-state edits behind the columns plugin's gestures and menu: no DOM, so each rule
 * (a move stays inside its pinned group, the last column cannot be hidden) is unit tested.
 */
import type { GridColumnState } from "@dojo-ng/data-grid";

export type PinGroup = "start" | "center" | "end";

/** Which pinned group a column is in. */
export function groupOf(state: GridColumnState, id: string): PinGroup {
	if (state.pinning.start.includes(id)) return "start";
	if (state.pinning.end.includes(id)) return "end";
	return "center";
}

/**
 * The columns a column can trade places with: visible, movable, and in its own pinned group,
 * in display order. `canMove` says which ids may move (the app's reorderable columns).
 */
export function moveGroup(state: GridColumnState, id: string, canMove: (id: string) => boolean): string[] {
	const g = groupOf(state, id);
	return state.order.filter((c) => groupOf(state, c) === g && state.visibility[c] !== false && canMove(c));
}

/**
 * Move `key` to `toIndex` among `items` (its move group, `toIndex` counted with `key` taken
 * out). Every other column keeps its slot: only the slots `items` occupy are refilled, so
 * hidden, fixed, and plugin columns never move. Returns the new order.
 */
export function moveWithin(order: readonly string[], items: readonly string[], key: string, toIndex: number): string[] {
	if (!items.includes(key)) return [...order];
	const rest = items.filter((id) => id !== key);
	const at = Math.max(0, Math.min(rest.length, toIndex));
	const next = [...rest.slice(0, at), key, ...rest.slice(at)];
	const set = new Set(items);
	let k = 0;
	return order.map((id) => (set.has(id) ? next[k++] : id));
}

/** Move a column one step (`delta` -1 toward the start, +1 toward the end) inside its group.
 *  Returns the new order, or null when it is already at that edge or cannot move. */
export function stepMove(state: GridColumnState, id: string, delta: -1 | 1, canMove: (id: string) => boolean): string[] | null {
	if (!canMove(id)) return null;
	const items = moveGroup(state, id, canMove);
	const from = items.indexOf(id);
	const to = from + delta;
	if (from < 0 || to < 0 || to >= items.length) return null;
	return moveWithin(state.order, items, id, to);
}

/** Pin a column to a side, or unpin it (`null`). The grid regroups the order, so a newly pinned
 *  column lands next to the unpinned columns, and an unpinned one returns beside its group. */
export function pinColumn(state: GridColumnState, id: string, side: "start" | "end" | null): GridColumnState {
	const start = state.pinning.start.filter((c) => c !== id);
	const end = state.pinning.end.filter((c) => c !== id);
	if (side === "start") start.push(id);
	if (side === "end") end.unshift(id);
	// The order decides where it lands in its new group: keep the pinned groups contiguous.
	const wasEnd = state.pinning.end.includes(id);
	const order = state.order.filter((c) => c !== id);
	if (side === "start") order.splice(start.length - 1, 0, id);
	else if (side === "end") order.splice(order.length - (end.length - 1), 0, id);
	// Unpinned: back to the edge of the unpinned columns it came from.
	else order.splice(wasEnd ? order.length - end.length : start.length, 0, id);
	return { ...state, order, pinning: { start, end } };
}

/** Whether a column may be hidden: it is visible, hideable, and not the last visible one of
 *  `userIds` (the app's columns). */
export function canHide(state: GridColumnState, id: string, userIds: readonly string[], hideable: (id: string) => boolean): boolean {
	if (state.visibility[id] === false || !hideable(id)) return false;
	return userIds.filter((c) => state.visibility[c] !== false).length > 1;
}

/** Show or hide a column. Hiding the last visible app column is refused (state unchanged). */
export function setVisible(state: GridColumnState, id: string, visible: boolean, userIds: readonly string[]): GridColumnState {
	const visibility = { ...state.visibility };
	if (visible) delete visibility[id];
	else {
		if (userIds.filter((c) => visibility[c] !== false && c !== id).length === 0) return state;
		visibility[id] = false;
	}
	return { ...state, visibility };
}

/** Clamp a width to a column's limits. */
export function clampWidth(px: number, min: number, max: number | undefined): number {
	return Math.round(Math.min(max ?? Infinity, Math.max(min, px)));
}

/** Set a column's pixel width. */
export function resizeColumn(state: GridColumnState, id: string, px: number): GridColumnState {
	return { ...state, sizing: { ...state.sizing, [id]: px } };
}
