# @dojo-ng/search-box

## 0.1.1

### Patch Changes

- Fix the suggestion popup failing an accessibility audit the moment it opened. The internal `<dj-list>` never had a `label`, so the popup listbox had no accessible name (`aria-input-field-name`); the `<input role="combobox">` set `aria-expanded` but not `aria-controls`, which axe-core requires for that role (`aria-required-attr`). Fixed with a stable `id` on the internal list plus a new label, and `aria-controls` on the input pointing at that id.
