---
"@dojo-ng/data-grid": minor
"@dojo-ng/data-grid-select": minor
---

Easier multi-select in the checkbox column.

- The whole checkbox cell is now the click target, not just the checkbox. A click that lands beside a small checkbox used to fall through to the row, which opened it under `activation="click"`. The cell now ticks or unticks its row, and Shift-click in it extends a range.
- Shift-click on a row selects the range from the anchor to that row, and never opens it. The grid's docs promised this, but nothing did it outside the checkboxes. The anchor is the last checkbox clicked or the grid's active row, whichever moved last, so clicking a row, Cmd/Ctrl-clicking one, or arrowing to one all set it. A second Shift-click extends from the same anchor.
- New plugin hook `rowClick(e, index, ctx)`: called for a pointer click on a body row before the core acts on it. Return `true` to claim the gesture; the core still moves the active row but does not toggle or activate.
