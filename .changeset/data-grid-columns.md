---
"@dojo-ng/data-grid": minor
"@dojo-ng/data-grid-columns": minor
---

Let users resize, reorder, pin, and hide `dj-data-grid` columns, and let the app save and restore that layout.

- `dj-data-grid` gains `columnState` (`{ sizing, order, pinning, visibility }`) and `dj-column-state-change`. Setting `columnState` from saved settings restores a layout: ids the grid no longer has are dropped, and columns added since come back at their declared place. No plugin is needed for that.
- Pinned columns stay put while the body scrolls sideways, in left-to-right and right-to-left layouts. When the columns are wider than the grid, the header scrolls with the body, Left and Right on a body row scroll it from the keyboard, and moving along the header row scrolls the header into view.
- `GridColumn` gains `minWidth`, `maxWidth`, `pinned` (the starting value), and `resizable`, `reorderable`, and `hideable` for the new plugin.
- Plugins get two hooks, `headerControls` (controls at a header's end, outside its sort button) and `headerKey` (a key on the header row before the grid acts), and the plugin context gains `setColumnState` and `defaultColumnState`.
- New package `@dojo-ng/data-grid-columns`: `columnsPlugin()` adds a resize handle (double-click fits the column to its widest rendered cell), drag to reorder with a keyboard grab (Space, arrows, Space, Escape, announced), and a column menu with Wider, Narrower, Move, Pin, Unpin, Hide, and a column chooser with Reset. Works in remote mode.
