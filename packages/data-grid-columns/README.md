# @dojo-ng/data-grid-columns

Let users resize, reorder, pin, and hide `<dj-data-grid>` columns, and pick columns from a chooser.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-columns
```

## Usage

Add the plugin, then keep the layout in your own storage: store each `dj-column-state-change`, and set `columnState` on load.

```html
<dj-data-grid id="orders" height="320px"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { columnsPlugin } from "@dojo-ng/data-grid-columns";
  const grid = document.getElementById("orders");
  grid.columns = [
    { id: "id", header: "Order", width: "90px", pinned: "start", hideable: false },
    { id: "customer", header: "Customer", minWidth: 120 },
    { id: "status", header: "Status" },
    { id: "total", header: "Total", width: "110px" },
  ];
  grid.data = [
    { id: 1001, customer: "Ada", status: "Shipped", total: "$42.00" },
    { id: 1002, customer: "Grace", status: "Open", total: "$18.50" },
  ];
  grid.plugins = [columnsPlugin()];

  const saved = localStorage.getItem("orders-columns");
  if (saved) grid.columnState = JSON.parse(saved);
  grid.addEventListener("dj-column-state-change", (e) => {
    localStorage.setItem("orders-columns", JSON.stringify(e.detail));
  });
</script>
```

## How it works

- The grid holds the layout: `grid.columnState` (`{ sizing, order, pinning, visibility }`) and the `dj-column-state-change` event. This plugin is the UI for it. An app that only restores a saved layout needs no plugin.
- Resize: drag the handle at a header's end edge. Double-click it to fit the column to its widest cell. Only the rows on screen are measured, since the rest are not in the page.
- Reorder: drag a header to a new place. Pinned columns move only among their own pinned group.
- Column menu: Wider, Narrower, Move left, Move right, Pin left, Pin right, Unpin, Hide, and Columns…, which opens a chooser with a checkbox per column and a Reset to the declared layout. The last visible column cannot be hidden.
- The menu button shows on header hover and keyboard focus (always on touch screens). Pass `menuButton: "always"` to show it in every header.

## Per column

- `resizable`, `reorderable`, and `hideable` (all default `true`), `minWidth` and `maxWidth` in pixels, and `pinned: "start"` or `"end"` as the starting value.
- Columns added by other plugins (the checkbox column, the drag handle) get no controls. A plugin column placed before every app column stays first, and joins the pinned start group when there is one.

## Keyboard

- On the header row (ArrowUp from the first row), Space grabs a column, Left and Right move it, Space drops it, and Escape cancels; each step is announced. Enter still sorts.
- Alt+ArrowDown, Shift+F10, or the Menu key opens the column menu, so every pointer action has a keyboard path.
- In the body, Left and Right scroll the columns sideways when they are wider than the grid.

## Save and restore

- Storage is the app's job. Listen for `dj-column-state-change`, store `e.detail`, and set `grid.columnState` on load. Ids the grid no longer has are dropped, and columns added since come back at their declared place.

## Rows from a server

- Works in remote mode (`rowCount`): columns do not depend on which rows are loaded.

## Examples

### Restore a layout without the plugin

`columnState` is core. Setting it orders, sizes, pins, and hides columns with no UI at all.

```html
<script type="module">
  grid.columnState = {
    order: ["status", "customer", "id", "total"],
    sizing: { customer: 220 },
    pinning: { start: ["status"], end: [] },
    visibility: { total: false },
  };
</script>
```
