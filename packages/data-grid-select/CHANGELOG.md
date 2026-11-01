# @dojo-ng/data-grid-select

## 0.2.0

### Minor Changes

- Remote rows, selection: `selectAll()` and `clearSelection()`, an `allSelected` state under which `rowSelection` lists the deselected rows, and a `selection` getter. `dj-selection-change` gains `ids`, `all`, `except`, and `count` (outside remote mode `all` is false and `ids`/`count` match `rows`). New context helper `ctx.rowIds(first, last)`. The select plugin's header checkbox selects every row on the server, and a Shift range over rows that are not loaded waits for them before selecting.
- Remote rows: `insertRows(index, rowsOrCount)` and `removeRows(index, count)` move cached rows, `rowCount`, `activeIndex`, and the select plugin's Shift anchor with their rows, and keep the rows on screen in place when the change is above them. New public `scrollToIndex(index, { align })` and `getVisibleRange()` (returns the new exported `VisibleRange` type) in both modes. New plugin hook `shiftRows`. The select plugin's Shift range now uses grid indices (`ctx.indexOf`/`ctx.rowAt`).

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @dojo-ng/data-grid@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @dojo-ng/data-grid@0.2.0

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/data-grid@0.1.2
