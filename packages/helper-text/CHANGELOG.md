# @dojo-ng/helper-text

## 0.1.2

### Patch Changes

- Screen readers now read helper and error text (CB20).

  - `dj-helper-text` no longer hides its text with `aria-hidden`.
  - `dj-text-input`, `dj-text-area`, `dj-select`, and `dj-native-select` point their native control's `aria-describedby` at the helper text, so it is read as the control's description. When a text input or text area is invalid, the error message is read instead. Controls without helper text set no `aria-describedby`.
  - `dj-select` now sets `aria-invalid` on its trigger when invalid, like the other controls.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
