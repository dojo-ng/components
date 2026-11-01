---
"@dojo-ng/data-grid-drag": minor
---

Remote mode: the dragged row is found through `ctx.rowAt`, so drags work on rows anywhere in a `rowCount` grid. `dj-row-dragstart` and `dj-row-dragend` gain `selection` (`{ ids, all, except, count }`, the full dragged set; `rows` stays the loaded rows), `data` and `label` receive it as a second argument, and the default drag label counts from it with the page's number formatting ("100,000 rows").
