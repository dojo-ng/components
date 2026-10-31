# @dojo-ng/card

## 0.2.0

### Minor Changes

- Add `path` and `track`. With `path` set, the card renders as a real link (`<a href>`) and dispatches `dj-navigate`; with `track` it also follows `nav:location` and shows `aria-current="page"` when it is the current page. Needs `@dojo-ng/history` installed to do either; without it the card behaves as before.

### Patch Changes

- Depend on `@dojo-ng/history` 0.3.0, so an app gets one copy of history alongside `dj-split-panel`.
- Depend on `@dojo-ng/history` 0.2.0.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
