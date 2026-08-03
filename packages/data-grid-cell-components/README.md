# @dojo-ng/data-grid-cell-components

In-row Lit components for @dojo-ng/data-grid (per-column render + actionButton/checkmark helpers)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Lets a column render arbitrary Lit content via `GridColumn.render` — a `dj-button`, `dj-icon`, `dj-chip`, a sparkline, anything — while columns without `render` fall through to other plugins and the core default. Two prebuilt helpers cover the common cases without authoring a template: `actionButton(label, action, opts?)` renders a small `dj-button` that emits `dj-cell-action` (detail `{ action, row }`) from the host and stops the click from also selecting the row, and `checkmarkCell(opts?)` renders an `aria-hidden` checkmark glyph with a visually-hidden Yes/No text alternative, so the value still reaches assistive tech. CONSTRAINT: cell content is reachable by mouse and touch today; cell-level keyboard navigation — tabbing into a button that lives inside a cell — is a later core feature, not something this plugin can add on its own.

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
