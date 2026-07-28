# @dojo-ng/data-grid

`<dj-data-grid>` — A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization). Core scope: columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation, and calculated columns (`GridColumn.compute`). Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail arrive as PLUGINS via the `plugins` property (plain objects from factory functions; see {@link DataGridPlugin}). A bare grid with `plugins=[]` behaves exactly as before. ARIA role=grid. `activation` separates opening a row from selecting rows: under `"click"` or `"double"` a plain click activates and emits `dj-activate` instead of toggling selection, Enter activates while Space still selects, and modifier-clicks stay reserved for selection. The default `"none"` keeps the original behavior, so this is purely additive. `dj-range-change` reports which rows are rendered, so a consumer can window its data or load more at the end of the list. The range INCLUDES the 8 overscan rows, so it is wider than what the user can see — hence `rendered`, not "visible".

> Activation — what a plain click or Enter MEANS on a row — is set by `activation`. The default `"none"` is the original behavior: click and Space/Enter all toggle selection, so nothing existing changes. Set `activation="click"` (the mail/preview-pane idiom) or `"double"` (the file-manager idiom) and opening a row becomes a separate gesture from selecting rows: a plain click activates and emits `dj-activate` (detail `{ row, index }`, where `row` is the original row data) WITHOUT touching selection. Keyboard splits on the platform convention — Enter activates, Space selects. Modifier clicks are reserved for selection and never activate: Ctrl/Cmd-click toggles the clicked row, Shift-click is the range gesture. `"double"` uses the platform's own `dblclick`, so the two `click` events a double click also produces can never activate. Activation fires regardless of `selectionMode`, including `"none"` — a read-only list with clickable rows needs no selection enabled. To let a click OPEN a row while the user also picks a set for bulk actions, combine `activation="click"` with `selection-mode="multiple"` and the checkbox column from `@dojo-ng/data-grid-select`. Viewport reporting: `dj-range-change` (detail `{ start, end, count, rendered }`) fires whenever the rendered row window moves, so a consumer can page data in and out or load more at the end of the list. `start` and `end` are the inclusive first and last rendered row-model indices, `count` is the total row count, and `rendered` is the full index list. THE RANGE INCLUDES THE 8 OVERSCAN ROWS the virtualizer keeps beyond the viewport, so it is wider than what the user can actually see — it is what the grid has committed to rendering (hence `rendered`, not "visible"), which is why a consumer that fetches this range never renders a hole. Treating it as the visible set would be wrong by up to eight rows at each end. End-reached is a one-line derivation, `if (e.detail.end >= e.detail.count - 1) loadMore()`, so there is no separate event for it. Nothing is rendered means `start` and `end` are `-1` with the real `count`, so a consumer learns the list went empty. The event fires after the render is committed and is deduplicated on an unchanged `(start, end, count)`, so ordinary re-renders (a selection toggle, a flags patch) are silent and reacting to it by setting `data` is safe. NOT YET SUPPORTED: windowing a data set LARGER than `data` — the grid sizes its scrollbar from `data.length`, so it cannot render a scrollbar for rows you have not loaded. That needs a separate total-count/sparse-data change to the `data` contract. Plugins: pass an array of plugin objects via the `plugins` property (JavaScript only). Recommended order: structural first (`treePlugin` OR `groupsPlugin`, never both), then `editPlugin`, `cellComponentsPlugin`, `formatsPlugin`, then chrome-only plugins (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`). A `plugins` change rebuilds the table.

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

**Events:** `dj-sort`, `dj-selection-change`, `dj-range-change` (detail `{ start, end, count, rendered }` — inclusive
first and last rendered row-model indices, the total row count, and the full index list; `start`
and `end` are -1 when nothing is rendered), `dj-activate` (detail `{ row, index }`, where `row` is
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

### Load more when the user reaches the end

`dj-range-change` reports the rendered row window, so a consumer can load the next page or window its data. End-reached is a one-line derivation from it; there is no separate event. Mind the `rendered` caveat in the note above: the window is WIDER than what the user can see, because it includes the virtualizer's overscan rows.

```html
<dj-data-grid id="feed" height="320px"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";

  const PAGE = 100;
  // Stands in for your API call.
  const fetchPage = async (offset) =>
    Array.from({ length: PAGE }, (_, i) => ({ title: "Item " + (offset + i) }));

  const grid = document.getElementById("feed");
  grid.columns = [{ id: "title", header: "Title" }];
  grid.data = await fetchPage(0);

  let loading = false;
  grid.addEventListener("dj-range-change", async (e) => {
    const { start, end, count, rendered } = e.detail;
    // End reached: the last rendered row is the last row there is. No separate event needed.
    if (end >= count - 1 && !loading) {
      loading = true;
      grid.data = [...grid.data, ...(await fetchPage(grid.data.length))];
      loading = false;
    }
    // For windowing, fetch around start/end and evict far from it. `rendered` is the exact
    // index list, which is what precise eviction wants.
    console.log(`rendered rows ${start}-${end} of ${count}`, rendered.length);
  });
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
