---
"@dojo-ng/data-grid": minor
"@dojo-ng/data-grid-select": minor
---

Remote mode: `insertRows(index, rowsOrCount)` and `removeRows(index, count)` move cached rows, `rowCount`, `activeIndex`, and the select plugin's Shift anchor with their rows, and keep the rows on screen in place when the change is above them. New public `scrollToIndex(index, { align })` and `getVisibleRange()` in both modes. New plugin hook `shiftRows`. The select plugin's Shift range now uses grid indices (`ctx.indexOf`/`ctx.rowAt`).
