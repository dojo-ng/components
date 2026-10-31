# @dojo-ng/tree

## 0.3.0

### Minor Changes

- Add `TreeNode.path`, `track` and `basePath`. Selecting a node with a path dispatches `dj-navigate`; with `track` the tree follows `nav:location`, selects the matching node, expands its ancestors and annotates the location with the trail. Modified clicks on a path node open it in a new tab. Needs `@dojo-ng/history` for navigation; without it the tree behaves as before.

### Patch Changes

- Depend on `@dojo-ng/history` 0.3.0, so an app gets one copy of history alongside `dj-split-panel`.
- Depend on `@dojo-ng/history` 0.2.0.

## 0.2.0

### Minor Changes

- `dj-tree` can be a drop target for native HTML5 drag and drop. Set `canDrop(id, types)` to say which rows accept a drag; the accepting row under the pointer gets the `row--drop-target` part and a built-in outline, a collapsed parent opens after `spring-delay` ms (default 800), and a drop emits `dj-drop` with `{ id, dataTransfer }`. With `canDrop` unset the tree ignores drags exactly as before.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/icon@0.1.1
