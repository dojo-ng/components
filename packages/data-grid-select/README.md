# @dojo-ng/data-grid-select

A checkbox selection column for `<dj-data-grid>`, with select-all and range selection.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## How it works

- The plugin adds a column; it does not hold the selection. The checkboxes read and write the grid's own row selection, so `selection-mode`, `rowSelection`, and `dj-selection-change` stay the only source of truth.
- `selection-mode="multiple"` gives checkboxes and a select-all checkbox in the header, with a real mixed state. `"single"` gives radio buttons and no header control. `"none"` adds no column.
- Shift-click a checkbox to select the range from the last one clicked. The range covers rows that are not rendered yet.

## Open rows and select them

- Combine it with `activation="click"` on the grid: a click opens a row (`dj-activate`), and the checkboxes build the set for bulk actions.

## Accessibility

- Always pass `label`. Without it, a screen reader hears a column of identical "Select row" controls.

## Examples

### Put the column on the right

Set `position: "end"` to append it instead of prepending; `width` sets the track.

```html
<script type="module">
  grid.plugins = [selectColumnPlugin({ position: "end", width: "3rem" })];
</script>
```
