---
"@dojo-ng/data-grid": minor
"@dojo-ng/data-grid-select": minor
---

Remote mode selection: `selectAll()` and `clearSelection()`, an `allSelected` state under which `rowSelection` lists the deselected rows, and a `selection` getter. `dj-selection-change` gains `ids`, `all`, `except`, and `count` (outside remote mode `all` is false and `ids`/`count` match `rows`). New context helper `ctx.rowIds(first, last)`. The select plugin's header checkbox selects every row on the server, and a Shift range over rows that are not loaded waits for them before selecting.
