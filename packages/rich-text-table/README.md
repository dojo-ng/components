# @dojo-ng/rich-text-table

Tables for `<dj-rich-text>`: insert a table, then add or remove rows and columns.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Using it

- Insert table opens an 8 by 8 grid: point to choose the size, click to insert.
- The table menu is available when the caret is in a table. It inserts a row above or below or a column left or right, deletes a row, a column, or the table, and turns the header row on or off.
- Select cells with the mouse; Tab and the arrow keys move between cells.

## Pasting

- With this plugin loaded, a pasted `<table>` becomes a real table. Without it, pasted tables become paragraphs.

## Setup

- Exports `tablePlugin` and `createTablePlugin()`. With `rich-text-slash` loaded, the slash menu also offers Table.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Not built

- Merging and splitting cells, column widths and resizing, editing captions (a pasted caption is kept, nothing more), and styling for tables inside tables.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
