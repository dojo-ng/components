---
"@dojo-ng/data-grid": minor
---

Remote rows: sorting goes to the host. A header click updates `sorting`, emits `dj-sort`, drops the cached rows, scrolls to the top, and asks for the top rows in a new epoch; read `grid.sorting` when answering.
