# @dojo-ng/data-grid-edit

Controlled inline cell editing for @dojo-ng/data-grid

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> CONTROLLED editing: the plugin never writes to `data`. Listen for `dj-cell-commit`, update your store, and assign a new `data` array. Place this plugin first in the array so its editor wins the cell.

## Install

```bash
npm install @dojo-ng/data-grid-edit
```

## Usage

F2/Enter on the active row or double-click starts editing; Enter/blur commits, Escape cancels. The grid never mutates your data — apply the commit yourself.

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { editPlugin } from "@dojo-ng/data-grid-edit";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name", editable: true },
    { id: "qty", header: "Qty", editable: { control: "number" } },
    { id: "status", header: "Status", editable: { control: "select", options: [
      { value: "active", label: "Active" }, { value: "retired", label: "Retired" },
    ] } },
  ];
  let rows = [{ name: "Widget", qty: 2, status: "active" }];
  g.data = rows;
  g.plugins = [editPlugin()];
  g.addEventListener("dj-cell-commit", (e) => {
    const { row, columnId, value } = e.detail;
    rows = rows.map((r) => (r === row ? { ...r, [columnId]: value } : r));
    g.data = rows; // controlled: you own the data
  });
</script>
```
