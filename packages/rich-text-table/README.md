# @dojo-ng/rich-text-table

Table plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes the three `@lexical/table` node classes (`TableNode`, `TableRowNode`, `TableCellNode`), registers `INSERT_TABLE_COMMAND` and Lexical's grid mouse-selection + Tab/arrow cell navigation, and adds two toolbar controls. "Insert table" opens an 8×8 grid picker (hover to size, click to insert); "Table menu" is enabled only when the caret is inside a table and offers insert row above/below, insert column left/right, delete row, delete column, toggle header row, and delete table. Exports `tablePlugin` and `createTablePlugin()`. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. PASTE: with this plugin loaded a pasted `<table>` imports as a real table (the paste sanitizer allowlists table markup); WITHOUT the plugin, pasted table elements degrade to paragraphs. DEFERRED: merge/split cells, column widths/resizing, caption UI (the tag survives paste, nothing more), nested-table styling beyond level 1.

## Install

```bash
npm install @dojo-ng/rich-text-table
```

## Usage

Compose the table plugin with the default set. Insert from the 8×8 grid picker, then edit rows and columns from the table menu.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { tablePlugin } from "@dojo-ng/rich-text-table";
  document.getElementById("editor").plugins = [...defaultPlugins, tablePlugin];
</script>
```
