# @dojo-ng/data-grid

`<dj-data-grid>` — A virtualized, sortable, selectable data grid built on TanStack Table and TanStack Virtual.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Give it `columns`, `data`, and a `height`. The core covers columns, in-memory data, sorting, virtual rows, row selection, keyboard row navigation, and calculated columns (`GridColumn.compute`). Everything else is a plugin. The grid has ARIA role `grid`.

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

## Plugins

- Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail are plugins. Pass an array of plugin objects to the `plugins` property, from JavaScript only.
- A recommended order: one structural plugin first (`treePlugin` or `groupsPlugin`, never both), then `editPlugin`, `cellComponentsPlugin`, and `formatsPlugin`, then the plugins that only add controls (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`).
- Changing `plugins` rebuilds the table, so set it once, early.

## Opening rows: `activation`

`activation` decides what a plain click or Enter means on a row.

- `"none"` (the default): click, Space, and Enter all toggle selection.
- `"click"` (the mail and preview-pane idiom) or `"double"` (the file-manager idiom): a plain click, or a double click, opens the row and emits `dj-activate` with `{ row, index }`, where `row` is the original row data. Selection does not change.
- With activation on, Enter opens the row and Space selects it.
- Modifier clicks always select and never open: Ctrl or Cmd-click toggles a row, and Shift-click selects a range.
- `"double"` uses the browser's own `dblclick`, so the two clicks inside a double click never open the row on their own.
- Activation works with any `selection-mode`, including `"none"`, so a read-only list can have clickable rows.
- To open rows by clicking while the user also builds a set for bulk actions, combine `activation="click"`, `selection-mode="multiple"`, and the checkbox column from `@dojo-ng/data-grid-select`.

## Rendered rows: `dj-range-change`

- `dj-range-change` fires when the window of rendered rows moves, so you can load data in and out, or load more at the end of the list.
- The detail is `{ start, end, count, rendered }`: the first and last rendered row index (inclusive), the total number of rows, and the list of rendered indexes.
- The range includes the 8 extra rows the grid renders beyond each edge of the viewport. It is what the grid has rendered, not what the user can see, so fetching this range never leaves a gap.
- To load more at the end: `if (e.detail.end >= e.detail.count - 1) loadMore()`.
- When nothing is rendered, `start` and `end` are -1 and `count` is the real count.
- The event fires after rendering and only when `(start, end, count)` changes, so setting `data` in the handler is safe.

## Printing

- When the page is printed, every row becomes part of a real `<table>` with a `<thead>`, and browsers repeat the header on each printed page. This does not apply to rows drawn by the detail plugin (`@dojo-ng/data-grid-detail`).
- Safari does not repeat the table header on each printed page. This is a WebKit limitation with no reliable CSS fix.

## Not supported yet

- A data set larger than `data`: the scrollbar is sized from `data.length`, so it cannot include rows that are not loaded.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

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

## CSS parts

- `grid`
- `head`
- `row`
- `cell`
- `chrome-top`
- `chrome-bottom`
- `subhead`
- `detail`

## Events

- `dj-sort`
- `dj-selection-change`
- `dj-range-change`: Detail `{ start, end, count, rendered }` — inclusive
first and last rendered row-model indices, the total row count, and the full index list; `start`
and `end` are -1 when nothing is rendered.
- `dj-activate`: Detail `{ row, index }`, where `row` is
the original row data.

## Methods

- `toggleAt(index: number)`
- `activateAt(index: number)`: Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only list with clickable rows is a real case) but never under `activation="none"`.

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

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
