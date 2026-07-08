import { html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import {
	$createParagraphNode,
	$getNodeByKey,
	$getSelection,
	$isRangeSelection,
	$isRootOrShadowRoot,
	$isTextNode,
	COMMAND_PRIORITY_EDITOR,
	type LexicalNode,
} from "lexical";
import {
	INSERT_TABLE_COMMAND,
	TableCellHeaderStates,
	TableCellNode,
	TableNode,
	TableRowNode,
	applyTableHandlers,
	getTableElement,
	$createTableNodeWithDimensions,
	$deleteTableColumn__EXPERIMENTAL,
	$deleteTableRow__EXPERIMENTAL,
	$findTableNode,
	$insertTableColumn__EXPERIMENTAL,
	$insertTableRow__EXPERIMENTAL,
	$isTableCellNode,
	$isTableNode,
	$isTableRowNode,
} from "@lexical/table";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import { getDefaultLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import {
	defineRichTextPlugin,
	ensureEditorStyles,
	type RichTextContext,
	type RichTextPlugin,
} from "@dojo-ng/rich-text";
import "@dojo-ng/popup";
import "@dojo-ng/button";

const EN: Record<string, string> = {
	insertTable: "Insert table",
	tableMenu: "Table menu",
	tableInsertRowAbove: "Insert row above",
	tableInsertRowBelow: "Insert row below",
	tableInsertColumnLeft: "Insert column left",
	tableInsertColumnRight: "Insert column right",
	tableDeleteRow: "Delete row",
	tableDeleteColumn: "Delete column",
	tableToggleHeaderRow: "Toggle header row",
	tableDeleteTable: "Delete table",
};
registerDefaults("dj", EN);

const TABLE_ICON = html`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></svg>`;

/** Content styles for tables, injected once into document.head (the editor renders in light DOM). */
const CONTENT_CSS = `
dj-rich-text table { border-collapse: collapse; width: 100%; }
dj-rich-text td, dj-rich-text th { border: 1px solid var(--dj-color-border, #d1d5db); padding: .35rem .5rem; }
dj-rich-text th { background: var(--dj-color-background-alt, #f3f4f6); }
`;

/** Chrome styles for the grid picker and table menu (the popups render in the toolbar's light DOM). */
const PICKER_CSS = `
.dj-rt-table-picker { padding: .5rem; }
.dj-rt-table-grid { display: grid; grid-template-columns: repeat(8, 1.25rem); gap: 2px; }
.dj-rt-table-grid button { width: 1.25rem; height: 1.25rem; padding: 0; cursor: pointer; border: 1px solid var(--dj-color-border, #d1d5db); background: var(--dj-color-background, #fff); border-radius: 2px; }
.dj-rt-table-grid button.hi { background: var(--dj-color-primary-200, #bfdbfe); border-color: var(--dj-color-primary, #2563eb); }
.dj-rt-table-caption { margin-top: .4rem; text-align: center; font-size: .85rem; color: var(--dj-color-text, #111827); }
.dj-rt-table-menu { display: flex; flex-direction: column; min-width: 12rem; }
`;

const GRID_MAX = 8;

let warned = false;
function warnOnce(err: unknown): void {
	if (warned) return;
	warned = true;
	console.warn("[dj-rich-text-table] table handler setup skipped:", err);
}

export interface TablePluginOptions {
	/** Included for API symmetry with the other plugins; no options are used in v1. */
	reserved?: never;
}

/** The TableNode that contains the current selection, or null when the selection is outside a table. */
function selectionTable(ctx: RichTextContext): TableNode | null {
	let table: TableNode | null = null;
	ctx.editor.getEditorState().read(() => {
		const sel = $getSelection();
		if (!$isRangeSelection(sel)) return;
		table = $findTableNode(sel.anchor.getNode());
	});
	return table;
}

/** Run a table op inside a single update, then return focus to the editor. */
function runOp(ctx: RichTextContext, fn: () => void): void {
	ctx.editor.update(() => fn());
	ctx.editor.focus();
}

/** Flip every first-row cell of the selection's table between ROW-header and no-header, as one group. */
function toggleHeaderRow(): void {
	const sel = $getSelection();
	if (!$isRangeSelection(sel)) return;
	const table = $findTableNode(sel.anchor.getNode());
	if (!table) return;
	const firstRow = table.getFirstChild();
	if (!$isTableRowNode(firstRow)) return;
	const cells = firstRow.getChildren().filter($isTableCellNode);
	if (!cells.length) return;
	const makeHeader = !cells[0].hasHeaderState(TableCellHeaderStates.ROW);
	for (const cell of cells) {
		if (cell.hasHeaderState(TableCellHeaderStates.ROW) !== makeHeader) {
			cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
		}
	}
}

/** Remove the selection's table entirely. */
function deleteTable(): void {
	const sel = $getSelection();
	if (!$isRangeSelection(sel)) return;
	const table = $findTableNode(sel.anchor.getNode());
	if (table) table.remove();
}

interface MenuOp {
	key: string; // i18n key
	run(): void;
}

const MENU_OPS: MenuOp[] = [
	{ key: "tableInsertRowAbove", run: () => $insertTableRow__EXPERIMENTAL(false) },
	{ key: "tableInsertRowBelow", run: () => $insertTableRow__EXPERIMENTAL(true) },
	{ key: "tableInsertColumnLeft", run: () => $insertTableColumn__EXPERIMENTAL(false) },
	{ key: "tableInsertColumnRight", run: () => $insertTableColumn__EXPERIMENTAL(true) },
	{ key: "tableDeleteRow", run: () => $deleteTableRow__EXPERIMENTAL() },
	{ key: "tableDeleteColumn", run: () => $deleteTableColumn__EXPERIMENTAL() },
	{ key: "tableToggleHeaderRow", run: toggleHeaderRow },
	{ key: "tableDeleteTable", run: deleteTable },
];

/**
 * Table plugin for `<dj-rich-text>`. Contributes the three `@lexical/table` node classes and registers
 * the insert command + grid-style mouse/keyboard cell handling. Two toolbar controls: an "Insert table"
 * button that opens an 8×8 grid picker, and a "Table menu" that operates on the table under the caret
 * (insert/delete rows and columns, toggle the header row, delete the table). Enabled only inside a table.
 *
 * Paste: TA1's sanitizer allowlists table markup, so with this plugin loaded a pasted `<table>` imports
 * as a real table (Lexical's `TableNode.importDOM`). Without the plugin, pasted table elements degrade
 * to paragraphs.
 */
export function createTablePlugin(_options: TablePluginOptions = {}): RichTextPlugin {
	const gridPopupRef = createRef<HTMLElement & { open: boolean; anchor?: HTMLElement }>();
	const gridTriggerRef = createRef<HTMLElement>();
	const gridRef = createRef<HTMLElement>();
	const captionRef = createRef<HTMLElement>();
	const menuPopupRef = createRef<HTMLElement & { open: boolean; anchor?: HTMLElement }>();
	const menuTriggerRef = createRef<HTMLElement>();

	const msg = (ctx: RichTextContext, key: string): string => {
		const locale = ctx.host.getAttribute("lang") || getDefaultLocale();
		return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
	};

	// --- Grid picker highlight (managed via direct DOM, so no per-hover Lit re-render is needed). ---
	const highlight = (r: number, c: number): void => {
		const grid = gridRef.value;
		if (grid) {
			for (const btn of grid.querySelectorAll<HTMLButtonElement>("button[data-r]")) {
				const br = Number(btn.dataset.r);
				const bc = Number(btn.dataset.c);
				btn.classList.toggle("hi", br <= r && bc <= c);
			}
		}
		if (captionRef.value) captionRef.value.textContent = r && c ? `${r} × ${c}` : "";
	};
	const clearHighlight = (): void => highlight(0, 0);

	const renderPicker = (ctx: RichTextContext, onPick: (r: number, c: number) => void) => {
		const cells: Array<{ r: number; c: number }> = [];
		for (let r = 1; r <= GRID_MAX; r++) {
			for (let c = 1; c <= GRID_MAX; c++) cells.push({ r, c });
		}
		return html`
			<div class="dj-rt-table-picker" @pointerleave=${clearHighlight}>
				<div class="dj-rt-table-grid" ${ref(gridRef)}>
					${cells.map(
						({ r, c }) => html`<button
							type="button"
							data-r=${r}
							data-c=${c}
							aria-label=${`${r} × ${c}`}
							@pointerenter=${() => highlight(r, c)}
							@focus=${() => highlight(r, c)}
							@click=${() => onPick(r, c)}
						></button>`,
					)}
				</div>
				<div class="dj-rt-table-caption" ${ref(captionRef)}></div>
			</div>
		`;
	};

	return defineRichTextPlugin({
		name: "table",
		nodes: [TableNode, TableRowNode, TableCellNode],
		// Slash-menu entry: insert a default 3×3 table with headers (payload takes strings in 0.21).
		inserts: [
			{
				id: "table", label: "Table", keywords: ["table", "grid"],
				run: (ctx) => ctx.command(INSERT_TABLE_COMMAND, { rows: "3", columns: "3", includeHeaders: true }),
			},
		],
		setup: (ctx) => {
			ensureEditorStyles("dj-rich-text-table", CONTENT_CSS);
			ensureEditorStyles("dj-rich-text-table-picker", PICKER_CSS);
			return mergeRegister(
				ctx.editor.registerCommand(
					INSERT_TABLE_COMMAND,
					(payload) => {
						const rows = Number(payload.rows);
						const columns = Number(payload.columns);
						if (!rows || !columns) return true;
						const table = $createTableNodeWithDimensions(rows, columns, payload.includeHeaders);
						$insertNodeToNearestRoot(table);
						if ($isRootOrShadowRoot(table.getParentOrThrow())) {
							// Guarantee an editable paragraph after the table so the caret can leave it.
							const after = table.getNextSibling();
							if (!after) table.insertAfter($createParagraphNode());
						}
						const first = table.getFirstDescendant<LexicalNode>();
						if ($isTextNode(first)) first.select();
						return true;
					},
					COMMAND_PRIORITY_EDITOR,
				),
				// Grid mouse-selection + Tab/arrow cell navigation for each table as it is created.
				ctx.editor.registerMutationListener(TableNode, (mutations) => {
					try {
						ctx.editor.getEditorState().read(() => {
							for (const [key, type] of mutations) {
								if (type !== "created") continue;
								const tableNode = $getNodeByKey(key);
								if (!$isTableNode(tableNode)) continue;
								const dom = ctx.editor.getElementByKey(key);
								if (!dom) continue;
								const tableElement = getTableElement(tableNode, dom);
								if (!tableElement) continue;
								applyTableHandlers(tableNode, tableElement, ctx.editor, true);
							}
						});
					} catch (err) {
						warnOnce(err);
					}
				}),
			);
		},
		toolbar: [
			{
				id: "insert-table",
				group: "table",
				order: 0,
				label: EN.insertTable,
				render: (ctx) => {
					const insertTable = msg(ctx, "insertTable");
					const openPicker = () => {
						const p = gridPopupRef.value;
						if (!p) return;
						p.anchor = gridTriggerRef.value ?? undefined;
						clearHighlight();
						p.open = true;
					};
					const pick = (r: number, c: number) => {
						if (gridPopupRef.value) gridPopupRef.value.open = false;
						ctx.command(INSERT_TABLE_COMMAND, {
							rows: String(r),
							columns: String(c),
							includeHeaders: true,
						});
					};
					return html`
						<span class="dj-rt-table-tool">
							<dj-button
								${ref(gridTriggerRef)}
								label=${insertTable}
								title=${insertTable}
								@click=${openPicker}
							>
								<span slot="icon">${TABLE_ICON}</span>
							</dj-button>
							<dj-popup ${ref(gridPopupRef)} position="below" .scrollLock=${false}>
								${renderPicker(ctx, pick)}
							</dj-popup>
						</span>
					`;
				},
			},
			{
				id: "table-menu",
				group: "table",
				order: 1,
				label: EN.tableMenu,
				render: (ctx) => {
					const tableMenu = msg(ctx, "tableMenu");
					const inTable = !!selectionTable(ctx);
					const openMenu = () => {
						const p = menuPopupRef.value;
						if (!p) return;
						p.anchor = menuTriggerRef.value ?? undefined;
						p.open = true;
					};
					const choose = (op: MenuOp) => {
						if (menuPopupRef.value) menuPopupRef.value.open = false;
						runOp(ctx, op.run);
					};
					return html`
						<span class="dj-rt-table-tool">
							<dj-button
								${ref(menuTriggerRef)}
								label=${tableMenu}
								title=${tableMenu}
								?disabled=${!inTable}
								@click=${openMenu}
							>
								<span slot="icon">⋯</span>
							</dj-button>
							<dj-popup ${ref(menuPopupRef)} position="below" .scrollLock=${false}>
								<div class="dj-rt-table-menu">
									${MENU_OPS.map(
										(op) => html`<dj-button kind="text" @click=${() => choose(op)}
											>${msg(ctx, op.key)}</dj-button
										>`,
									)}
								</div>
							</dj-popup>
						</span>
					`;
				},
			},
		],
	});
}

/** The table plugin with default options. */
export const tablePlugin = createTablePlugin();

export default tablePlugin;
