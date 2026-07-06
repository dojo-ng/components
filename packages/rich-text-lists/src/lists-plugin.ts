import { html } from "lit";
import {
	$getSelection,
	$isRangeSelection,
	$getNearestNodeFromDOMNode,
	$getNodeByKey,
	KEY_SPACE_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	type LexicalCommand,
	type LexicalEditor,
	type LexicalNode,
} from "lexical";
import {
	ListNode, ListItemNode, $isListNode, $isListItemNode, registerList, insertList,
	INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND, REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { getDefaultLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import { defineRichTextPlugin, ensureEditorStyles, type RichTextContext } from "@dojo-ng/rich-text";

/**
 * Lists plugin for `<dj-rich-text>`. Contributes the list node classes, installs Lexical's list
 * behavior (`registerList`), and adds bulleted/numbered/checklist toolbar buttons that toggle the
 * current block in and out of a list.
 *
 * Checklists: the installed @lexical/list does not export `registerCheckList`, and `registerList` does
 * not handle `INSERT_CHECK_LIST_COMMAND`, so this plugin owns the check-list interaction itself — it
 * registers the insert command (`insertList(editor, "check")`), syncs `data-dj-checked`/`role`/
 * `aria-checked` onto each check item's `<li>` via a mutation listener (theme-independent, keyed by
 * CSS), toggles on a click in the marker zone, and toggles on Space at the start of an item. Checked
 * state round-trips through `value` on 0.21's native list export/import (no `html` overrides needed).
 */

const EN: Record<string, string> = { checkList: "Checklist" };
registerDefaults("dj", EN);

const CHECKLIST_CSS = `
dj-rich-text li[data-dj-checked] { list-style: none; position: relative; padding-inline-start: 1.8em; }
dj-rich-text li[data-dj-checked]::before {
	content: "";
	position: absolute;
	inset-inline-start: 0;
	top: 0.15em;
	width: 1em;
	height: 1em;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.85em;
	line-height: 1;
	color: #fff;
	cursor: pointer;
	border: 1px solid var(--dj-color-border, #d1d5db);
	border-radius: 2px;
}
dj-rich-text li[data-dj-checked="true"]::before {
	content: "✓";
	background: var(--dj-color-primary, #2563eb);
	border-color: var(--dj-color-primary, #2563eb);
}
dj-rich-text li[data-dj-checked="true"] { text-decoration: line-through; opacity: 0.7; }
`;

const msg = (ctx: RichTextContext, key: string): string => {
	const locale = ctx.host.getAttribute("lang") || getDefaultLocale();
	return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
};

type ListKind = "bullet" | "number" | "check";
const INSERT_COMMAND: Record<ListKind, LexicalCommand<void>> = {
	bullet: INSERT_UNORDERED_LIST_COMMAND,
	number: INSERT_ORDERED_LIST_COMMAND,
	check: INSERT_CHECK_LIST_COMMAND,
};

/** The list type containing the selection (`bullet` | `number` | `check`), or null if none. */
function currentListType(ctx: RichTextContext): string | null {
	let result: string | null = null;
	ctx.editor.getEditorState().read(() => {
		const sel = $getSelection();
		if (!$isRangeSelection(sel)) return;
		let node: LexicalNode | null = sel.anchor.getNode();
		while (node) {
			if ($isListNode(node)) { result = node.getListType(); return; }
			node = node.getParent();
		}
	});
	return result;
}

/** Toggle the selection into `target`, or out of it when it is already that list type. */
function toggleList(ctx: RichTextContext, target: ListKind) {
	if (currentListType(ctx) === target) {
		ctx.command(REMOVE_LIST_COMMAND, undefined);
		return;
	}
	ctx.command(INSERT_COMMAND[target], undefined);
}

/** Whether `node` is a ListItemNode directly inside a check list. */
function isCheckItem(node: LexicalNode | null): node is ListItemNode {
	if (!$isListItemNode(node)) return false;
	const parent = node.getParent();
	return $isListNode(parent) && parent.getListType() === "check";
}

/** Reflect each check-item's checked state onto its `<li>` as `data-dj-checked`/`role`/`aria-checked`. */
function registerCheckAttrSync(editor: LexicalEditor): () => void {
	return editor.registerMutationListener(ListItemNode, (mutations) => {
		editor.getEditorState().read(() => {
			for (const [key, type] of mutations) {
				if (type === "destroyed") continue;
				const el = editor.getElementByKey(key);
				if (!el) continue;
				const node = $getNodeByKey(key);
				if (isCheckItem(node)) {
					const checked = node.getChecked() === true;
					el.setAttribute("data-dj-checked", checked ? "true" : "false");
					el.setAttribute("role", "checkbox");
					el.setAttribute("aria-checked", checked ? "true" : "false");
				} else {
					el.removeAttribute("data-dj-checked");
					el.removeAttribute("role");
					el.removeAttribute("aria-checked");
				}
			}
		});
	});
}

/** Toggle a check item when the user clicks in its marker zone (the ~1.6em nearest the list edge). */
function registerCheckClickToggle(editor: LexicalEditor): () => void {
	let currentRoot: HTMLElement | null = null;
	const onClick = (e: MouseEvent) => {
		const target = e.target;
		if (!(target instanceof Element)) return;
		const li = target.closest("li");
		if (!li || !li.hasAttribute("data-dj-checked")) return;
		const style = getComputedStyle(li);
		const em = parseFloat(style.fontSize) || 16;
		const rect = li.getBoundingClientRect();
		const inZone = style.direction === "rtl"
			? e.clientX > rect.right - 1.6 * em
			: e.clientX < rect.left + 1.6 * em;
		if (!inZone) return;
		e.preventDefault();
		editor.update(() => {
			const node = $getNearestNodeFromDOMNode(li);
			if ($isListItemNode(node)) node.setChecked(!node.getChecked());
		});
	};
	const dispose = editor.registerRootListener((root, prev) => {
		if (prev) prev.removeEventListener("click", onClick);
		if (root) root.addEventListener("click", onClick);
		currentRoot = root;
	});
	return () => {
		if (currentRoot) currentRoot.removeEventListener("click", onClick);
		dispose();
	};
}

/** Space at the start of a check item toggles it (instead of inserting a space). */
function registerCheckSpaceToggle(editor: LexicalEditor): () => void {
	return editor.registerCommand(
		KEY_SPACE_COMMAND,
		(event: KeyboardEvent) => {
			let handled = false;
			editor.update(() => {
				const sel = $getSelection();
				if (!$isRangeSelection(sel) || !sel.isCollapsed() || sel.anchor.offset !== 0) return;
				let node: LexicalNode | null = sel.anchor.getNode();
				let item: ListItemNode | null = null;
				while (node) {
					if ($isListItemNode(node)) { item = node; break; }
					node = node.getParent();
				}
				if (!item || !isCheckItem(item)) return;
				item.setChecked(!item.getChecked());
				handled = true;
			});
			if (handled && event) event.preventDefault();
			return handled;
		},
		COMMAND_PRIORITY_HIGH,
	);
}

export const listsPlugin = defineRichTextPlugin({
	name: "lists",
	nodes: [ListNode, ListItemNode],
	setup: (ctx) => {
		ensureEditorStyles("dj-rich-text-checklist", CHECKLIST_CSS);
		const editor = ctx.editor;
		const disposers: Array<() => void> = [
			registerList(editor),
			// registerList does not handle the check command, and registerCheckList is not exported.
			editor.registerCommand(
				INSERT_CHECK_LIST_COMMAND,
				() => { insertList(editor, "check"); return true; },
				COMMAND_PRIORITY_LOW,
			),
			registerCheckAttrSync(editor),
			registerCheckClickToggle(editor),
			registerCheckSpaceToggle(editor),
		];
		return () => { for (const d of disposers) d(); };
	},
	toolbar: (ctx) => [
		{
			id: "bullet-list", group: "list", order: 1, label: "Bulleted list",
			icon: html`<span style="font-size:1.1em;line-height:1">&bull;</span>`,
			isActive: (c) => currentListType(c) === "bullet",
			run: (c) => toggleList(c, "bullet"),
		},
		{
			id: "numbered-list", group: "list", order: 2, label: "Numbered list",
			icon: "1.",
			isActive: (c) => currentListType(c) === "number",
			run: (c) => toggleList(c, "number"),
		},
		{
			id: "check-list", group: "list", order: 3, label: msg(ctx, "checkList"),
			icon: html`<span style="font-size:1.05em;line-height:1">☑</span>`,
			isActive: (c) => currentListType(c) === "check",
			run: (c) => toggleList(c, "check"),
		},
	],
});

export default listsPlugin;
