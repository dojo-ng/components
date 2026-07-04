/**
 * Pure geometry + move math for the drag-and-drop core. No DOM access here so it is unit
 * testable without layout; the controller feeds it measured rects/positions.
 */

export type Axis = "x" | "y";

export interface Rect {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

/** The along-axis center of a rect. */
export function centerOf(rect: Rect, axis: Axis): number {
	return axis === "x" ? (rect.left + rect.right) / 2 : (rect.top + rect.bottom) / 2;
}

/** Is a point inside a rect (edges inclusive)? */
export function pointInRect(x: number, y: number, r: Rect): boolean {
	return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * The index at which to insert an item, given the along-axis centers of the items already in
 * the target zone (in order, EXCLUDING the item being dragged when reordering within its own
 * zone) and the pointer position along the axis. Returns 0..centers.length: insert before the
 * first item whose center is past the pointer, else append at the end.
 */
export function insertionIndex(centers: number[], pointer: number): number {
	let i = 0;
	while (i < centers.length && pointer >= centers[i]) i++;
	return i;
}

export interface MovePayload {
	key: string;
	from: string;
	to: string;
	fromIndex: number;
	toIndex: number;
}

/**
 * Resolve a completed drag into a move payload, or null when it is a no-op (dropped back at its
 * own position in its own zone). `toIndex` is already expressed against the target zone AFTER
 * the dragged item is removed from its origin, matching `applyCardMove`'s contract.
 */
export function resolveMove(m: MovePayload): MovePayload | null {
	if (m.from === m.to && m.fromIndex === m.toIndex) return null;
	return m;
}
