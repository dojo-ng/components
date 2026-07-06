// Tests for the rich-text table plugin. The grid picker, table menu, drag-select, and the exact
// $generateHtmlFromNodes round-trip are browser checks (TA5): happy-dom's `:scope >` selector support
// is broken, which defeats TableNode.exportDOM (it queries `:scope > tr` etc.), so headless HTML export
// of a table is empty. Here we verify what the headless harness CAN prove: plugin shape, that
// INSERT_TABLE_COMMAND builds the right node structure, that the reconciled DOM renders real <table>
// markup with header cells, and that a pasted table survives the sanitizer.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $nodesOfType } from "lexical";
import {
	TableNode,
	TableRowNode,
	TableCellNode,
	TableCellHeaderStates,
	$isTableRowNode,
	$isTableCellNode,
	$createTableNodeWithDimensions,
	INSERT_TABLE_COMMAND,
} from "@lexical/table";
import { sanitizeHtml } from "../packages/rich-text/dist/index.js";
import { tablePlugin, createTablePlugin } from "../packages/rich-text-table/dist/index.js";

const makeEditor = () =>
	createEditor({ nodes: [TableNode, TableRowNode, TableCellNode], onError: (e) => { throw e; } });

test("plugin shape: name table, contributes 3 table nodes, 2 render toolbar items", () => {
	assert.equal(tablePlugin.name, "table");
	assert.deepEqual(tablePlugin.nodes, [TableNode, TableRowNode, TableCellNode]);
	assert.equal(tablePlugin.toolbar.length, 2);
	assert.equal(typeof tablePlugin.toolbar[0].render, "function");
	assert.equal(typeof tablePlugin.toolbar[1].render, "function");
	// A second plugin instance is independent but shares the same shape.
	assert.equal(createTablePlugin().name, "table");
});

test("INSERT_TABLE_COMMAND builds a 2×3 table with first-row header cells", () => {
	const editor = makeEditor();
	const ctx = {
		editor,
		host: document.createElement("div"),
		command: (type, payload) => editor.dispatchCommand(type, payload),
		onSelectionChange: () => () => {},
		activeFormats: () => new Set(),
	};
	const dispose = tablePlugin.setup(ctx);
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			root.append(p);
			p.selectEnd();
			editor.dispatchCommand(INSERT_TABLE_COMMAND, {
				rows: "2",
				columns: "3",
				includeHeaders: true,
			});
		},
		{ discrete: true },
	);
	let rowCount = 0;
	let firstRowCells = 0;
	let firstRowAllHeaders = false;
	let bodyCellIsHeader = true;
	editor.getEditorState().read(() => {
		const tables = $nodesOfType(TableNode);
		assert.equal(tables.length, 1);
		const rows = tables[0].getChildren().filter($isTableRowNode);
		rowCount = rows.length;
		const cells0 = rows[0].getChildren().filter($isTableCellNode);
		firstRowCells = cells0.length;
		firstRowAllHeaders = cells0.every((c) => c.hasHeaderState(TableCellHeaderStates.ROW));
		// A non-corner body cell must NOT be a row header (proves headers are the first row, not all cells).
		const bodyCells = rows[1].getChildren().filter($isTableCellNode);
		bodyCellIsHeader = bodyCells[bodyCells.length - 1].hasHeaderState(TableCellHeaderStates.ROW);
	});
	assert.equal(rowCount, 2);
	assert.equal(firstRowCells, 3);
	assert.equal(firstRowAllHeaders, true);
	assert.equal(bodyCellIsHeader, false);
	if (typeof dispose === "function") dispose();
});

test("reconciled DOM renders a <table> with <th> header cells and <td> body cells", () => {
	// Structural proxy for HTML export (which happy-dom can't serialize; see file header). Uses raw
	// nodes + a root element, avoiding applyTableHandlers so no happy-dom layout is required.
	const editor = makeEditor();
	const container = document.createElement("div");
	document.body.appendChild(container);
	editor.setRootElement(container);
	editor.update(
		() => {
			$getRoot().append($createTableNodeWithDimensions(2, 3, true));
		},
		{ discrete: true },
	);
	assert.equal(container.querySelectorAll("table").length, 1);
	assert.equal(container.querySelectorAll("tr").length, 2);
	assert.ok(container.querySelectorAll("th").length >= 3, "first row rendered as header cells");
	assert.ok(container.querySelectorAll("td").length >= 1, "body cells rendered");
	editor.setRootElement(null);
	container.remove();
});

test("a pasted table survives the sanitizer with structure and colspan/rowspan intact", () => {
	// Same fixture family as the TA1 sanitizer tests: the allowlisted table markup passes through so
	// Lexical's TableNode.importDOM can rebuild it on paste.
	const out = sanitizeHtml(
		'<table><thead><tr><th colspan="2">H</th></tr></thead>' +
		'<tbody><tr><td rowspan="2">a</td><td>b</td></tr></tbody></table>',
	);
	for (const tag of ["table", "thead", "tbody", "tr", "th", "td"]) {
		assert.equal(new RegExp(`<${tag}[ >]`, "i").test(out), true, `${tag} survived`);
	}
	assert.match(out, /colspan="2"/);
	assert.match(out, /rowspan="2"/);
});
