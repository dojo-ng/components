# @dojo-ng/breadcrumb-group

## 0.2.0

### Minor Changes

- Add `track` and `resolveTitle`. With `track`, the crumbs come from the navigation location's trail (or from its path), a plain click on a crumb navigates through `@dojo-ng/history`, and `items` is ignored. The landmark name is now translated, and the separator is drawn from `--dj-breadcrumb-separator`. Needs `@dojo-ng/history` installed for `track`; without it the group behaves as before.

### Patch Changes

- Depend on `@dojo-ng/history` 0.3.0, so an app gets one copy of history alongside `dj-split-panel`.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
