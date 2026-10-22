---
"@dojo-ng/data-grid-drag": minor
---

New plugin: `rowDragPlugin({ type, data, label })` makes `dj-data-grid` rows native HTML5 drag sources. Dragging a selected row drags the selection; dragging an unselected row drags it alone. Emits `dj-row-dragstart` (cancelable) and `dj-row-dragend`; dragged rows carry the `row--dragging` part.
