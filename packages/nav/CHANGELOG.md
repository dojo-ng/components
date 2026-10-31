# @dojo-ng/nav

## 0.2.0

### Minor Changes

- Add `track`. A plain click on a link to a page of the same app navigates through `@dojo-ng/history`, the link for the current page gets `aria-current="page"`, and a collapsed panel closes with focus returning to the trigger. Needs `@dojo-ng/history` installed; without it the nav behaves as before.

### Patch Changes

- Depend on `@dojo-ng/history` 0.3.0, so an app gets one copy of history alongside `dj-split-panel`.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/slide-pane@0.1.2
