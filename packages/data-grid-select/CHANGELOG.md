# @dojo-ng/data-grid-select

## 0.3.2

### Patch Changes

- Updated dependencies
  - @dojo-ng/data-grid@0.6.0

## 0.3.1

### Patch Changes

- Updated dependencies
  - @dojo-ng/data-grid@0.5.0

## 0.3.0

### Minor Changes

- Easier multi-select in the checkbox column.

  - The whole checkbox cell is now the click target, not just the checkbox. A click that lands beside a small checkbox used to fall through to the row, which opened it under `activation="click"`. The cell now ticks or unticks its row, and Shift-click in it extends a range.
  - Shift-click on a row selects the range from the anchor to that row, and never opens it. The grid's docs promised this, but nothing did it outside the checkboxes. The anchor is the last checkbox clicked or the grid's active row, whichever moved last, so clicking a row, Cmd/Ctrl-clicking one, or arrowing to one all set it. A second Shift-click extends from the same anchor.
  - New plugin hook `rowClick(e, index, ctx)`: called for a pointer click on a body row before the core acts on it. Return `true` to claim the gesture; the core still moves the active row but does not toggle or activate.

### Patch Changes

- Updated dependencies
  - @dojo-ng/data-grid@0.4.0

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
