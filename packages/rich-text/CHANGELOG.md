# @dojo-ng/rich-text

## 0.1.6

### Patch Changes

- Fix form reset and `dj-form` (CB30).

  - Every form control now has `defaultValue`, the `value` attribute, as on a native input. A form reset returns each control to it. Before, some controls went back to the attribute and others (`dj-select`, `dj-list`, `dj-radio-group`, `dj-time-picker`, `dj-typeahead`, `dj-rate`, `dj-checkbox-group`, `dj-chip-typeahead`, `dj-range-slider`) always went back to empty.
  - `dj-form` treats only form controls as fields: `dj-*` form controls and native inputs, selects, and text areas. A named title pane, button, or icon is no longer gathered on submit or cleared on reset.
  - `dj-form` submits native controls the way a native form does. A native text input was left out before, because it has a `checked` property that is always false. A multi-select now submits every selected option.
  - `dj-form`'s `reset()` resets native controls the native way (a checkbox goes back to its `checked` attribute instead of having its value erased), and it clears the `user-valid`/`user-invalid` states, as a native form reset does. Form controls get a `resetInteraction()` method for this.
  - A required `dj-radio-group` now shows as valid when the choice is made with the arrow keys, not only with a click.

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.4

## 0.1.5

### Patch Changes

- Fix a paste sanitizer bypass. `sanitizeHtml` now drops `javascript:`, `data:`, and other unsafe URLs that hide their scheme with tabs, newlines, or control characters, such as `java&#9;script:` or a leading `\x01`. Browsers ignore those characters when they parse a URL, so the old check saw a relative link while the browser ran `javascript:`. The check now removes them before testing the scheme. Safe links keep their original value.

## 0.1.4

### Patch Changes

- Give every `dj-rich-text` toolbar button hover text. The default toolbar renderer set only `aria-label`, so Bold, Italic, Underline, Undo, Redo, and any plugin item without its own `render` showed no tooltip. Each item's `label` now also becomes the `title` of the native button inside `dj-button`, which is where the pointer hovers. The accessible name is still the label, and the host element gets no `title` of its own. Items with a custom `render` are unchanged.

## 0.1.3

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/button@0.1.2
  - @dojo-ng/dojo-element@0.1.2

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
