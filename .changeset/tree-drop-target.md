---
"@dojo-ng/tree": minor
---

`dj-tree` can be a drop target for native HTML5 drag and drop. Set `canDrop(id, types)` to say which rows accept a drag; the accepting row under the pointer gets the `row--drop-target` part and a built-in outline, a collapsed parent opens after `spring-delay` ms (default 800), and a drop emits `dj-drop` with `{ id, dataTransfer }`. With `canDrop` unset the tree ignores drags exactly as before.
