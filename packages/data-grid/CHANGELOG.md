# @dojo-ng/data-grid

## 0.3.1

### Patch Changes

- Keyboard and screen reader fixes.

  - Keys typed into a control inside the grid, such as the filter plugin's subheader inputs, now reach that control. Space, Home, End and the arrow keys used to move the active row instead.
  - Sorting works from the keyboard. ArrowUp from the first row moves to the header row, Left and Right move between headers (mirrored in right-to-left layouts), Home and End go to the first and last header, Enter or Space sorts, and ArrowDown returns to the first row. The grid is still a single tab stop.
  - A sortable header now holds a `<button part="sort-button">`, so it has a button role and name. The sort arrow is hidden from screen readers. `aria-sort` is `ascending` or `descending` on a sorted column and absent otherwise (it used to be `none` on every sortable column).
  - The grid sets `aria-colcount`, and header, filter and body cells set `aria-colindex`.

- Updated dependencies
  - @dojo-ng/dojo-element@0.1.6

## 0.3.0

### Minor Changes

- Remote rows. Set `rowCount` to show a list that lives on a server: the scrollbar is sized from it, rows not loaded yet render as placeholder rows (part `row--placeholder`, `aria-busy`), and the grid asks for aligned blocks with `dj-rows-request` (`{ start, end, epoch, reason }`). Answer with `setRows(start, rows, epoch)`; an answer from an older epoch is ignored and the rows are asked for again. New properties `blockSize`, `cacheSize` (farthest blocks dropped first), and `settleMs` (fast jumps wait until the view holds still), and the `--dj-data-grid-placeholder` token. Every index is absolute, End reaches `rowCount - 1`, and PageUp/PageDown now work in both modes. Plugins reach rows through the new `ctx.rowAt(index)` and `ctx.indexOf(row)`. Plugins that need every row on the client (tree, groups, filter, pagination, edit, detail, export) are left out in remote mode with one console warning, and printing prints the cached rows. Outside remote mode nothing changes.
- Remote rows, selection: `selectAll()` and `clearSelection()`, an `allSelected` state under which `rowSelection` lists the deselected rows, and a `selection` getter. `dj-selection-change` gains `ids`, `all`, `except`, and `count` (outside remote mode `all` is false and `ids`/`count` match `rows`). New context helper `ctx.rowIds(first, last)`. The select plugin's header checkbox selects every row on the server, and a Shift range over rows that are not loaded waits for them before selecting.
- Remote rows: `insertRows(index, rowsOrCount)` and `removeRows(index, count)` move cached rows, `rowCount`, `activeIndex`, and the select plugin's Shift anchor with their rows, and keep the rows on screen in place when the change is above them. New public `scrollToIndex(index, { align })` and `getVisibleRange()` (returns the new exported `VisibleRange` type) in both modes. New plugin hook `shiftRows`. The select plugin's Shift range now uses grid indices (`ctx.indexOf`/`ctx.rowAt`).
- Remote rows: sorting goes to the host. A header click updates `sorting`, emits `dj-sort`, drops the cached rows, scrolls to the top, and asks for the top rows in a new epoch; read `grid.sorting` when answering.

## 0.2.0

### Minor Changes

- Give `dj-data-grid` a supported way to take focus and to style its keyboard cursor. `focus()` and `blur()` on the host now reach the inner `role="grid"` element. The focus ring moves to that element (it was styled on an inner box that never takes focus, so it never showed), and the active row gets an inset bar while the grid is focused. The active row and each selected row carry new parts, `row--active` and `row--selected`, merged with any parts a plugin adds such as `row--unread`. A new `dj-active-change` event (detail `{ index, row }`) fires when the user moves the active row by key or click; setting `activeIndex` from code stays silent. Because a row can now carry several parts, select rows with `[part~="row"]` rather than `[part="row"]`. The rowstate plugin's documentation is updated to match.

### Patch Changes

- Keep a selected row's tint while the pointer is over it. In `dj-data-grid`'s own styles, the hover rule outranked the selected rule, so a ticked row turned the plain hover color under the pointer and read as unticked. Forced-colors mode had the same problem: a hovered selected row dropped from `Highlight` to `Canvas`. Selected rows now keep their selection colors when hovered, in both modes.

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2

## 0.1.1

### Patch Changes

- Fix the sticky header's `z-index` leaking onto the page. `:host` now sets `isolation: isolate`, so `.head`'s internal `z-index: 1` is contained within the component's own stacking context instead of competing with the consumer's page-level stacking order.
