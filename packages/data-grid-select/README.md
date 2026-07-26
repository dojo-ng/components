# @dojo-ng/data-grid-select

Checkbox selection column plugin for @dojo-ng/data-grid (select-all, range selection)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> It owns a COLUMN, not the selection. Checkboxes read and write TanStack's existing row selection through `row.getIsSelected()`/`toggleSelected()`, so `selection-mode`, `rowSelection`, and `dj-selection-change` remain the single source of truth — there is no second copy of the selection to keep in sync. Pair it with `activation="click"` on the grid and a click OPENS a row (`dj-activate`) while the checkboxes build the set bulk actions run on; that combination is the whole point. Behavior follows `selection-mode`: `"multiple"` gives checkboxes plus a header select-all with a real indeterminate state, `"single"` gives radios and no header control (select-all is meaningless), and `"none"` adds no column at all. Shift-click a checkbox to select the range from the last one clicked; the range is computed over the ROW MODEL, so it covers rows the virtualizer has never rendered. Always pass `label` — a column of forty identical "Select row" controls is useless with a screen reader.

## Install

```bash
npm install @dojo-ng/data-grid-select
```

## Usage

The intended combination. `activation="click"` makes a plain click open a row; the checkbox column builds the set that bulk actions run on. Name each checkbox with `label`.

```html
<dj-data-grid id="mail" height="320px" activation="click" selection-mode="multiple"></dj-data-grid>
<button id="archive">Archive selected</button>
<script type="module">
  import "@dojo-ng/data-grid";
  import { selectColumnPlugin } from "@dojo-ng/data-grid-select";
  const grid = document.getElementById("mail");
  grid.columns = [{ id: "from", header: "From" }, { id: "subject", header: "Subject" }];
  grid.data = [
    { from: "Ada", subject: "Analytical engine" },
    { from: "Grace", subject: "Compiler notes" },
  ];
  grid.plugins = [selectColumnPlugin({ label: (m) => `Select ${m.subject}` })];

  let selected = [];
  grid.addEventListener("dj-selection-change", (e) => { selected = e.detail.rows; });
  grid.addEventListener("dj-activate", (e) => open(e.detail.row));
  document.getElementById("archive").addEventListener("click", () => archive(selected));
</script>
```

## Examples

### Put the column on the right

Set `position: "end"` to append it instead of prepending; `width` sets the track.

```html
<script type="module">
  grid.plugins = [selectColumnPlugin({ position: "end", width: "3rem" })];
</script>
```
