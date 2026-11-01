---
"@dojo-ng/data-grid": minor
---

Remote rows: rowCount, placeholder rows, dj-rows-request/setRows with epoch, row cache with eviction, PageUp/PageDown, absolute indices across unloaded rows. In remote mode the grid leaves out plugins that need every row on the client (tree, groups, filter, pagination, edit, detail, export) with one console warning per plugin set, and printing prints the cached rows.
