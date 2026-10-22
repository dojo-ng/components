# @dojo-ng/chip-typeahead

## 0.1.2

### Patch Changes

- Fix two accessibility violations when the suggestion popup is open in `dj-typeahead` and `dj-chip-typeahead`: the combobox now points `aria-controls` at the suggestion list, and the list has an accessible name ("Suggestions", localizable through the `dj` i18n namespace). `dj-chip-typeahead` gains a dependency on `@dojo-ng/i18n` for the label.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/chip@0.1.1
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/label@0.1.1
  - @dojo-ng/list@0.1.2
  - @dojo-ng/popup@0.1.1
