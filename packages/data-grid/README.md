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

## Focus and the active row

- `focus()` on the host moves focus into the grid, so a consumer can return the keyboard to it (after closing a dialog, say) without reaching into the shadow root.
- The grid shows a focus ring when it has keyboard focus, and the active row gets a stronger marker while the grid is focused.
- The active row (the keyboard cursor) and each selected row carry extra parts, `row--active` and `row--selected`, alongside `row`, so a consumer can restyle them: `dj-data-grid::part(row--selected) { color: inherit }`. Plugin-contributed row parts (from `@dojo-ng/data-grid-rowstate`) are kept alongside them. Match rows with `[part~="row"]`, not `[part="row"]`, since a row can carry several parts.
- `dj-active-change` fires when the user moves the active row with the keyboard or a click, with detail `{ index, row }`, where `row` is the original row data. Setting `activeIndex` from code does not fire it, the same way setting a native input's `value` fires no `change`.

## Printing

- When the page is printed, every row becomes part of a real `<table>` with a `<thead>`, and browsers repeat the header on each printed page. This does not apply to rows drawn by the detail plugin (`@dojo-ng/data-grid-detail`).
- Safari does not repeat the table header on each printed page. This is a WebKit limitation with no reliable CSS fix.

## Rows from a server: `rowCount`

- Set `rowCount` to the total number of rows on the server to turn on remote mode. `data` is then ignored, and the scrollbar is sized from `rowCount`.
- Rows the grid has not loaded render as placeholder rows (part `row--placeholder`, `aria-busy="true"`). Plugin cell and row hooks are not called for them.
- The grid asks for rows with `dj-rows-request`, detail `{ start, end, epoch, reason }`: an inclusive, block-aligned range of absolute indices. Answer with `grid.setRows(start, rows, epoch)`, passing back the request's `epoch`. An answer with an older epoch is ignored, and the grid asks again.
- Rows load in blocks of `blockSize` (default 100). The grid keeps at most `cacheSize` rows (default 2,000) and drops the blocks farthest from the screen first.
- After a jump of more than one screen (a scrollbar drag, End), the grid waits until the rows on screen have held still for `settleMs` (default 100) before asking.
- Every index is absolute: `activeIndex`, event indices, and `aria-rowindex` count from the top of the full list, loaded or not. When the active row is not loaded yet, `dj-active-change` fires with `row: undefined`, then again with the row once it arrives. `dj-activate` does nothing on a placeholder.
- Sorting is the host's job. A header click updates `sorting`, emits `dj-sort`, drops the cached rows, scrolls to the top (the active row goes to 0), and requests the top rows in a new epoch. Read `grid.sorting` when answering. The grid never reorders rows it is given.
- When rows are added or removed on the server, call `insertRows(index, rowsOrCount)` or `removeRows(index, count)`. Cached rows, `activeIndex`, and the Shift anchor move with their rows, and a change above the screen scrolls by the same amount so nothing on screen jumps. For anything else, `resetRows()`. `getVisibleRange()` and `scrollToIndex()` let a host keep the user's place across a refresh.
- Give the grid a `getRowId`, so selection survives rows being dropped from the cache.
- Select all means every row on the server, loaded or not: `selectAll()` turns on `allSelected`, and `rowSelection` then holds the rows the user deselected. `dj-selection-change` carries `{ rows, ids, all, except, count }`; `rows` is only the loaded selected rows, so use `ids` (or `all` and `except`) and `count`. Inserts, removals, resets, and sorts keep select all on.
- A Shift range (`@dojo-ng/data-grid-select`) over rows that are not loaded asks for them (`reason: "selection"`) and selects once they have all arrived. If the list changes first (a new epoch), the range is dropped.
- Rows have a fixed height (`rowHeight`) in remote mode.

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
| `rowCount` | row-count | `number` | — |
| `blockSize` | block-size | `number` | `100` |
| `settleMs` | settle-ms | `number` | `100` |
| `cacheSize` | cache-size | `number` | `2000` |

## CSS parts

- `grid`
- `head`
- `row`
- `row--active`
- `row--selected`
- `row--placeholder`
- `cell`
- `chrome-top`
- `chrome-bottom`
- `subhead`
- `detail`

## Events

- `dj-active-change`: Detail `{ index, row }`.
- `dj-selection-change`: Detail `{ rows, ids, all, except, count }`.
- `dj-rows-request`: Detail `{ start, end, epoch, reason }`,
remote mode only.
- `dj-sort`
- `dj-range-change`: Detail `{ start, end, count, rendered }` — inclusive
first and last rendered row-model indices, the total row count, and the full index list; `start`
and `end` are -1 when nothing is rendered.
- `dj-activate`: Detail `{ row, index }`, where `row` is
the original row data.

## Methods

- `focus(options: FocusOptions)`: Forward focus to the element that owns the keyboard (the `role="grid"` div). The print table also carries `part="grid"`, so this selects by class, not by part.
- `blur()`
- `setRows(start: number, rows: Row[], epoch: number): boolean`: Remote mode: answer a `dj-rows-request`. `start` is the absolute index of `rows[0]`; pass back the request's `epoch`. Returns `false`, and keeps nothing, when the epoch is stale (the list changed since the request) or the grid is not in remote mode.
- `selectAll()`: Select every row. In remote mode this is every row on the server, loaded or not (`allSelected`); elsewhere it selects every row in the row model. Needs `selectionMode="multiple"`. Emits `dj-selection-change`.
- `clearSelection()`: Deselect every row and turn `allSelected` off. Emits `dj-selection-change` if anything was selected.
- `resetRows({ keepScroll = true }: { keepScroll?: boolean } = {})`: Remote mode: drop every cached row and ask again for the rows on screen. Call it when the list changed in a way inserts and removals cannot describe. Starts a new epoch, so answers to earlier requests are ignored. `keepScroll: false` also scrolls to the top.
- `insertRows(index: number, rowsOrCount: Row[] | number)`: Remote mode: `rowsOrCount` rows were added on the server at absolute index `index`. Pass the new rows to cache them, or a count to show placeholders the grid will request. Cached rows, `rowCount`, `activeIndex`, and the select plugin's Shift anchor move down with their rows; selection is by id and does not move. When the insert is above the first visible row, the view scrolls by the same amount so the rows on screen stay put. Starts a new epoch, so answers to earlier requests are ignored. Does nothing outside remote mode.
- `removeRows(index: number, count: number)`: Remote mode: rows `index..index + count - 1` were removed on the server. Cached rows after them, `rowCount`, `activeIndex`, and the select plugin's Shift anchor move up. When the active row is removed, the row that slides into the first removed slot becomes active (clamped to the last row); this is silent, like any programmatic `activeIndex` change. Rows removed above the first visible row scroll the view by the same amount, so the rows on screen stay put. Starts a new epoch. Does nothing outside remote mode.
- `scrollToIndex(index: number, { align = "auto" }: { align?: "start" | "center" | "end" | "auto" } = {})`: Scroll so row `index` is in view. `align` is `"start"`, `"center"`, `"end"`, or `"auto"` (the default: scroll only as far as needed). In remote mode the index is absolute. Works in both modes.
- `getVisibleRange(): VisibleRange`: The first and last row (inclusive) inside the viewport, without the overscan rows the grid also renders. A row partly in view counts. In remote mode the indices are absolute. Both are -1 when there are no rows. A host can read it before a refresh to keep what the user was looking at in place.
- `toggleAt(index: number)`
- `activateAt(index: number)`: Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only list with clickable rows is a real case) but never under `activation="none"`.

## CSS custom properties

- `--dj-data-grid-placeholder`: The bar drawn in each cell of a row that is not loaded yet.

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
