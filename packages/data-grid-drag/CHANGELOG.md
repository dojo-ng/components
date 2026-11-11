# @dojo-ng/data-grid-drag

## 0.2.1

### Patch Changes

- Updated dependencies
  - @dojo-ng/data-grid@0.4.0

## 0.2.0

### Minor Changes

- Remote rows: the dragged row is found through `ctx.rowAt`, so drags work on rows anywhere in a `rowCount` grid. `dj-row-dragstart` and `dj-row-dragend` gain `selection` (`{ ids, all, except, count }`, the full dragged set; `rows` stays the loaded rows), `data` and `label` receive it as a second argument, and the default drag label counts from it with the page's number formatting ("100,000 rows").

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @dojo-ng/data-grid@0.3.0

## 0.1.0

### Minor Changes

- New plugin: `rowDragPlugin({ type, data, label })` makes `dj-data-grid` rows native HTML5 drag sources. Dragging a selected row drags the selection; dragging an unselected row drags it alone. Emits `dj-row-dragstart` (cancelable) and `dj-row-dragend`; dragged rows carry the `row--dragging` part.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @dojo-ng/data-grid@0.2.0
