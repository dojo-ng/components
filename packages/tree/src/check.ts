import type { TreeNode } from "./tree.js";
import { isLazy } from "./flatten.js";

export interface Checks {
	/** Ids that are fully checked: listed, below a listed id, or with every loaded child checked. */
	checked: Set<string>;
	/** Ids with some, not all, of their loaded children checked. */
	partial: Set<string>;
}

const hasLoaded = (n: TreeNode): n is TreeNode & { children: TreeNode[] } => !!n.children?.length;

/**
 * The check state of every node, from the ids the app lists as checked. Pure.
 * - A listed id checks everything loaded below it.
 * - A parent with loaded children shows what its children show: all checked, some (partial), or none.
 * - A node with no loaded children (a leaf, or a lazy node not yet loaded) is checked when listed or
 *   when an ancestor is.
 */
export function computeChecks(nodes: readonly TreeNode[], listed: Iterable<string>): Checks {
	const set = listed instanceof Set ? listed : new Set(listed);
	const checked = new Set<string>();
	const partial = new Set<string>();
	/** Returns 2 for checked, 1 for partial, 0 for none. */
	const walk = (node: TreeNode, inherited: boolean): number => {
		const self = inherited || set.has(node.id);
		let state: number;
		if (hasLoaded(node)) {
			let all = true, any = false;
			for (const child of node.children) {
				const s = walk(child, self);
				if (s !== 2) all = false;
				if (s > 0) any = true;
			}
			state = all ? 2 : any ? 1 : 0;
		} else {
			state = self ? 2 : 0;
		}
		if (state === 2) checked.add(node.id);
		else if (state === 1) partial.add(node.id);
		return state;
	};
	for (const n of nodes) walk(n, false);
	return { checked, partial };
}

/**
 * The checked ids after toggling `id`: a node that is not fully checked becomes checked along with
 * every loaded node below it; a fully checked one is cleared along with them, and its ancestors stop
 * being checked. Ancestors whose children are now all checked are listed too. Pure.
 */
export function toggleCheck(nodes: readonly TreeNode[], listed: Iterable<string>, id: string): string[] {
	const { checked } = computeChecks(nodes, listed);
	const parent = new Map<string, TreeNode>();
	let target: TreeNode | undefined;
	const index = (list: readonly TreeNode[], up?: TreeNode) => {
		for (const n of list) {
			if (up) parent.set(n.id, up);
			if (n.id === id) target = n;
			if (n.children) index(n.children, n);
		}
	};
	index(nodes);
	if (!target) return [...checked];
	const turnOn = !checked.has(id);
	const below = (n: TreeNode) => {
		if (turnOn) checked.add(n.id); else checked.delete(n.id);
		n.children?.forEach(below);
	};
	below(target);
	for (let up = parent.get(id); up; up = parent.get(up.id)) {
		if (!turnOn) checked.delete(up.id);
		else if (up.children!.every((c) => checked.has(c.id))) checked.add(up.id);
		else break;
	}
	return [...checked];
}

/** Checked nodes whose children are not loaded yet: the app has to resolve what is below them. */
export function pendingParents(nodes: readonly TreeNode[], checked: ReadonlySet<string>): string[] {
	const out: string[] = [];
	const walk = (list: readonly TreeNode[]) => {
		for (const n of list) {
			if (checked.has(n.id) && isLazy(n)) out.push(n.id);
			if (n.children) walk(n.children);
		}
	};
	walk(nodes);
	return out;
}
