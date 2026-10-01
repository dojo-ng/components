# @dojo-ng/rich-text

## 0.1.2

### Patch Changes

- The toolbar now wraps onto more than one row (`flex-wrap: wrap`) instead of overflowing its host
  horizontally with no way to reach the items past the edge. Found in a real consumer (NovelMaker):
  a host that keeps the editor in a narrow reading column, plus a few plugins each contributing a
  handful of toolbar items, ran the last several items off-screen with no scroll affordance short of
  widening the whole browser window.

## 0.1.1

### Patch Changes

- Fix `value` having no effect when assigned after the editor is already built — only a construction-time property, `setHtml()`, or a `plugins` change (which rebuilds the editor) ever reached the document before. `value` is now readable and writable at any time: assigning it after the editor is built replaces the whole document (discarding the selection and undo history) and emits no `dj-change`, the same as assigning to a native input's `value`.
- Updated dependencies
  - @dojo-ng/button@0.1.1
