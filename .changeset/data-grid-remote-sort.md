---
"@dojo-ng/data-grid": minor
---

Remote rows: sorting goes to the host. In remote mode a header click updates `sorting`, emits `dj-sort`, drops the cached rows, scrolls to the top, and requests the top rows in a new epoch.
