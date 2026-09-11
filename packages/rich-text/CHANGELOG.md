# @dojo-ng/rich-text

## 0.1.1

### Patch Changes

- Fix `value` having no effect when assigned after the editor is already built — only a construction-time property, `setHtml()`, or a `plugins` change (which rebuilds the editor) ever reached the document before. `value` is now readable and writable at any time: assigning it after the editor is built replaces the whole document (discarding the selection and undo history) and emits no `dj-change`, the same as assigning to a native input's `value`.
- Updated dependencies
  - @dojo-ng/button@0.1.1
