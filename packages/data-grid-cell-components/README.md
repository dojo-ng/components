# @dojo-ng/data-grid-cell-components

Custom cell content for `<dj-data-grid>`: a column can render any Lit content, such as a `dj-button`, a `dj-icon`, a `dj-chip`, or a sparkline.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-cell-components
```

## Usage

Set `render` on a column for arbitrary Lit content, or use the prebuilt helpers. Action buttons emit `dj-cell-action` with the row.

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { cellComponentsPlugin, actionButton, checkmarkCell } from "@dojo-ng/data-grid-cell-components";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name" },
    { id: "active", header: "Active", sortable: false, render: checkmarkCell() },
    { id: "act", header: "", sortable: false, render: actionButton("Open", "open") },
  ];
  g.data = [{ name: "Widget", active: true }];
  g.plugins = [cellComponentsPlugin()];
  g.addEventListener("dj-cell-action", (e) => console.log(e.detail.action, e.detail.row));
</script>
```

## Custom cells

- Set `render` on a `GridColumn`. Columns without `render` are left to other plugins and the grid's default.

## Ready-made cells

- `actionButton(label, action, opts?)` renders a small `dj-button`. A click emits `dj-cell-action` with `{ action, row }` from the grid, and does not also select the row.
- `checkmarkCell(opts?)` renders a checkmark with hidden Yes or No text, so screen reader users also get the value.

## Not supported yet

- Keyboard access to controls inside a cell. Cell content can be used with a mouse or touch today; moving keyboard focus into a cell needs a change in the grid itself.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
