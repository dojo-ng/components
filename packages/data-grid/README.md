# @dojo-ng/data-grid

`<dj-data-grid>` — A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization). Core scope: columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation, and calculated columns (`GridColumn.compute`). Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail arrive as PLUGINS via the `plugins` property (plain objects from factory functions; see {@link DataGridPlugin}). A bare grid with `plugins=[]` behaves exactly as before. ARIA role=grid. `activation` separates opening a row from selecting rows: under `"click"` or `"double"` a plain click activates and emits `dj-activate` instead of toggling selection, Enter activates while Space still selects, and modifier-clicks stay reserved for selection. The default `"none"` keeps the original behavior, so this is purely additive.

> Activation — what a plain click or Enter MEANS on a row — is set by `activation`. The default `"none"` is the original behavior: click and Space/Enter all toggle selection, so nothing existing changes. Set `activation="click"` (the mail/preview-pane idiom) or `"double"` (the file-manager idiom) and opening a row becomes a separate gesture from selecting rows: a plain click activates and emits `dj-activate` (detail `{ row, index }`, where `row` is the original row data) WITHOUT touching selection. Keyboard splits on the platform convention — Enter activates, Space selects. Modifier clicks are reserved for selection and never activate: Ctrl/Cmd-click toggles the clicked row, Shift-click is the range gesture. `"double"` uses the platform's own `dblclick`, so the two `click` events a double click also produces can never activate. Activation fires regardless of `selectionMode`, including `"none"` — a read-only list with clickable rows needs no selection enabled. To let a click OPEN a row while the user also picks a set for bulk actions, combine `activation="click"` with `selection-mode="multiple"` and the checkbox column from `@dojo-ng/data-grid-select`. Plugins: pass an array of plugin objects via the `plugins` property (JavaScript only). Recommended order: structural first (`treePlugin` OR `groupsPlugin`, never both), then `editPlugin`, `cellComponentsPlugin`, `formatsPlugin`, then chrome-only plugins (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`). A `plugins` change rebuilds the table.

## Install

```bash
npm install @dojo-ng/data-grid
```

## Usage

Import the package to register the custom element, then use the tag.

TanStack-backed; provide `columns` and `data`, set a `height`.

```html
<dj-data-grid id="dg" height="320px" selection-mode="multiple"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  const el = document.getElementById("dg");
  el.columns = [{ id: "name", header: "Name" }, { id: "age", header: "Age" }];
  el.data = Array.from({ length: 1000 }, (_, i) => ({ name: "Row " + i, age: i }));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `columns` | columns | `GridColumn[]` | `[]` |
| `data` | data | `Row[]` | `[]` |
| `selectionMode` | selection-mode ↻ | `SelectionMode` | `"none"` |
| `activation` | activation ↻ | `ActivationMode` | `"none"` |
| `rowHeight` | row-height | `number` | `36` |
| `height` | height | `string` | `"20rem"` |
| `plugins` | — | `DataGridPlugin[]` | `[]` |

**Parts:** `grid`, `head`, `row`, `cell`, `chrome-top`, `chrome-bottom`, `subhead`, `detail`

**Events:** `dj-sort`, `dj-selection-change`, `dj-activate` (detail `{ row, index }`, where `row` is
the original row data)

**Methods:** `toggleAt(index: number)`, `activateAt(index: number)` (Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only list with clickable rows is a real case) but never under `activation="none"`.)

## Examples

### Master/detail: click opens, checkboxes select

The reason `activation` exists. A plain click opens a row in the detail pane and never disturbs the selection; the checkbox column builds the set that bulk actions act on. Enter opens the active row, Space selects it.

```html
<dj-data-grid id="mail" height="320px" activation="click" selection-mode="multiple"></dj-data-grid>
<button id="archive">Archive selected</button>
<pre id="open">(nothing open)</pre>
<script type="module">
  import "@dojo-ng/data-grid";
  import { selectColumnPlugin } from "@dojo-ng/data-grid-select";
  const grid = document.getElementById("mail");
  grid.columns = [{ id: "from", header: "From" }, { id: "subject", header: "Subject" }];
  grid.data = [
    { from: "Ada", subject: "Analytical engine" },
    { from: "Grace", subject: "Compiler notes" },
    { from: "Alan", subject: "Re: decidability" },
  ];
  grid.plugins = [selectColumnPlugin({ label: (m) => `Select ${m.subject}` })];

  // Opening a row: one gesture, one event. Never inferred from the selection.
  let selected = [];
  grid.addEventListener("dj-activate", (e) => {
    document.getElementById("open").textContent = "open: " + e.detail.row.subject;
  });
  grid.addEventListener("dj-selection-change", (e) => { selected = e.detail.rows; });
  document.getElementById("archive").addEventListener("click", () => archive(selected));
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
