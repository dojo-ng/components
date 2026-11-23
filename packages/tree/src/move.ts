import type { TreeNode } from "./tree.js";

/** Where a drop lands relative to the row under the pointer. */
export type DropPosition = "before" | "after" | "inside";

/**
 * Which part of a row a pointer is over, as a drop position. `fraction` is how far down the row the
 * pointer is (0 at the top edge, 1 at the bottom). Pure.
 * - A row that can take the drop (`canInside`) has a middle half that means "inside" and an edge
 *   quarter at the top and bottom that mean before and after.
 * - The bottom edge of an open parent (`open`) means "inside" instead, because "after" would draw the
 *   line above its first child. When it cannot take the drop either, that edge refuses (null).
 * - A row that cannot take the drop splits in half: before, after.
 */
export function dropZone(fraction: number, canInside: boolean, open: boolean): DropPosition | null {
	if (canInside) {
		if (fraction < 0.25) return "before";
		if (fraction > 0.75) return open ? "inside" : "after";
		return "inside";
	}
	if (fraction < 0.5) return "before";
	return open ? null : "after";
}

/**
 * The ids a drag of `id` carries. A row that is not in `checked` drags alone. A checked row drags
 * every checked row, but only the top-most ones: a checked parent already carries what is below it.
 * In tree order. Pure.
 */
export function dragIds(nodes: readonly TreeNode[], checked: ReadonlySet<string>, id: string): string[] {
	if (!checked.has(id)) return [id];
	const out: string[] = [];
	const walk = (list: readonly TreeNode[]) => {
		for (const n of list) {
			if (checked.has(n.id)) out.push(n.id);
			else if (n.children) walk(n.children);
		}
	};
	walk(nodes);
	return out;
}

/** True when `id` is one of `ids` or sits below one of them, given each row's parent. */
export function isUnder(id: string, ids: ReadonlySet<string>, parentOf: ReadonlyMap<string, string>): boolean {
	for (let at: string | undefined = id; at !== undefined; at = parentOf.get(at)) if (ids.has(at)) return true;
	return false;
}
