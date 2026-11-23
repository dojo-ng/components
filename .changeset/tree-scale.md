---
"@dojo-ng/tree": minor
---

Make `dj-tree` work at scale: it windows its rows above `virtual-threshold` (default 200), loads children on demand (`hasChildren`, `dj-load-children`, `setChildren`, with loading and retry rows), adds tri-state checkboxes (`checkable`, `checked`, `dj-check-change`), and rows can be dragged (`draggable-rows`, `drag-type`, `dj-move`). Rows are now flat `treeitem`s with `aria-level`, `aria-setsize`, and `aria-posinset`, with no nested `role="group"` lists.
