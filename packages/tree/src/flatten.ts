import type { TreeNode } from "./tree.js";

/** One visible row: a node plus where it sits among the rows and its siblings. */
export interface VisRow {
	id: string;
	node: TreeNode;
	/** Depth from the root, starting at 1 (the `aria-level`). */
	level: number;
	hasChildren: boolean;
	open: boolean;
	/** A real node, or the line shown under an open lazy node while its children load or after they failed. */
	kind: "node" | "loading" | "error";
	/** Siblings under the same parent, and this row's 1-based place among them (for aria). */
	setSize: number;
	posInSet: number;
}

/** True for a node whose children are still to be fetched: `hasChildren` set and no `children` yet. */
export function isLazy(node: TreeNode): boolean {
	return !!node.hasChildren && node.children === undefined;
}

export interface Flat {
	/** The visible rows in tree order: a node, then (when open) its descendants. */
	rows: VisRow[];
	/** Parent id by node id, for the rows that have one. */
	parentOf: Map<string, string>;
	/** Row index by node id. */
	indexOf: Map<string, number>;
	/** Open lazy nodes that have not been asked for their children yet, in tree order. */
	needLoad: string[];
}

/** The id of the loading or error line under a lazy node. */
export const statusId = (id: string, kind: "loading" | "error") => `${id}\u001f${kind}`;

export interface FlattenState {
	/** Lazy nodes whose children were requested and have not arrived. */
	loading?: ReadonlySet<string>;
	/** Lazy nodes whose last load failed. */
	failed?: { has(id: string): boolean };
}

/** Flatten `nodes` into the rows a tree shows, given the ids that are open. Pure: no DOM, no state. */
export function flattenTree(nodes: readonly TreeNode[], open: ReadonlySet<string>, state: FlattenState = {}): Flat {
	const rows: VisRow[] = [];
	const parentOf = new Map<string, string>();
	const indexOf = new Map<string, number>();
	const needLoad: string[] = [];
	const walk = (list: readonly TreeNode[], level: number, parentId: string | null) => {
		for (let i = 0; i < list.length; i++) {
			const node = list[i];
			const lazy = isLazy(node);
			const hasChildren = lazy || !!node.children?.length;
			const isOpen = hasChildren && open.has(node.id);
			indexOf.set(node.id, rows.length);
			rows.push({ id: node.id, node, level, hasChildren, open: isOpen, kind: "node", setSize: list.length, posInSet: i + 1 });
			if (parentId != null) parentOf.set(node.id, parentId);
			if (isOpen && lazy) {
				const kind = state.failed?.has(node.id) ? "error" : "loading";
				if (kind === "loading" && !state.loading?.has(node.id)) needLoad.push(node.id);
				const id = statusId(node.id, kind);
				indexOf.set(id, rows.length);
				parentOf.set(id, node.id);
				rows.push({ id, node, level: level + 1, hasChildren: false, open: false, kind, setSize: 1, posInSet: 1 });
			} else if (isOpen) walk(node.children!, level + 1, node.id);
		}
	};
	walk(nodes, 1, null);
	return { rows, parentOf, indexOf, needLoad };
}
