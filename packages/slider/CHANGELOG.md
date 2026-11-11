# @dojo-ng/slider

## 0.1.2

### Patch Changes

- Boolean properties that default to `true` can now be turned off from HTML (CB24). Before, any present attribute read as `true`, so `<dj-dialog closeable="false">` stayed closeable. Now the attribute value `"false"` (any case) means `false`, any other value means `true`, and leaving the attribute out keeps the `true` default. This covers dialog `closeable`/`underlay`, slide-pane `underlay`, popup `scroll-lock`, carousel `nav`, trigger-popup `match-width`, title-pane `closeable`, slider `show-output`, radio `tabbable`, typeahead `strict`, alert `open`, and loading-indicator `active`. `@dojo-ng/dojo-element` exports the converter as `defaultTrueBoolean`.
- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/label@0.1.1
