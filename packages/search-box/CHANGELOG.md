# @dojo-ng/search-box

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/chip@0.1.1
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/list@0.1.2
  - @dojo-ng/popup@0.1.1

## 0.1.1

### Patch Changes

- Fix the suggestion popup failing an accessibility audit the moment it opened. The internal `<dj-list>` never had a `label`, so the popup listbox had no accessible name (`aria-input-field-name`); the `<input role="combobox">` set `aria-expanded` but not `aria-controls`, which axe-core requires for that role (`aria-required-attr`). Fixed with a stable `id` on the internal list plus a new label, and `aria-controls` on the input pointing at that id.
