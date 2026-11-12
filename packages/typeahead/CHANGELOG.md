# @dojo-ng/typeahead

## 0.2.0

### Minor Changes

- Long lists, multiple selection, and options from a server.

  - `dj-list` is virtual above `virtual-threshold` rows (default 200): only the rows in view are in the DOM. The arrow keys, Home, End, PageUp, PageDown, and type-ahead by first letters cover every option, the active option is always rendered, and rendered options carry `aria-posinset` and `aria-setsize`. Rows have one height (`--dj-list-item-height`, or the first option measured once). `reorderable` is off while virtual. New `dj-scroll-end` event near the end of the list. New dependency: `@tanstack/virtual-core`; a page using an import map needs an entry for it.
  - `dj-list` gains `multiple` (value is a string array; the form value has one entry per value), PageUp/PageDown, type-ahead, and makes the selected option active on focus. Its loading spinner now has an accessible name.
  - `dj-select multiple`: chips in the trigger with a remove button each, Backspace removes the last, "+N" when they do not fit, the full list in the trigger's accessible name, optional `select-all` row, and `required` means at least one. Submits one entry per value; `dj-form` gives the array under the name.
  - `dj-select` and `dj-typeahead` open with the selected option in view, and their popup lists scroll inside 20rem (`--dj-select-list-max-height`, `--dj-typeahead-list-max-height`). Typeahead filtering of 10,000 options keeps up with typing.
  - `remote` on `dj-select` and `dj-typeahead`: the component emits `dj-options-request` (`{ query, offset, epoch }`) and the app answers with `setOptions(options, { epoch, total, append })`. Answers with an old epoch are dropped. Typeahead requests are debounced by `request-delay` (default 200 ms); the select pages when the user scrolls near the end. `selectedOptions` keeps labels for selected values that are not loaded. The loading state is announced.
  - `dj-chip-typeahead` picks up the virtual popup list for long option lists.

### Patch Changes

- Updated dependencies
  - @dojo-ng/list@0.2.0

## 0.1.5

### Patch Changes

- Boolean properties that default to `true` can now be turned off from HTML (CB24). Before, any present attribute read as `true`, so `<dj-dialog closeable="false">` stayed closeable. Now the attribute value `"false"` (any case) means `false`, any other value means `true`, and leaving the attribute out keeps the `true` default. This covers dialog `closeable`/`underlay`, slide-pane `underlay`, popup `scroll-lock`, carousel `nav`, trigger-popup `match-width`, title-pane `closeable`, slider `show-output`, radio `tabbable`, typeahead `strict`, alert `open`, and loading-indicator `active`. `@dojo-ng/dojo-element` exports the converter as `defaultTrueBoolean`.
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5
  - @dojo-ng/popup@0.1.2
  - @dojo-ng/text-input@0.1.5

## 0.1.4

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
  - @dojo-ng/list@0.1.3
  - @dojo-ng/text-input@0.1.4

## 0.1.3

### Patch Changes

- Fix two accessibility violations when the suggestion popup is open in `dj-typeahead` and `dj-chip-typeahead`: the combobox now points `aria-controls` at the suggestion list, and the list has an accessible name ("Suggestions", localizable through the `dj` i18n namespace). `dj-chip-typeahead` gains a dependency on `@dojo-ng/i18n` for the label.

## 0.1.2

### Patch Changes

- Fix form validation bugs found while writing the Forms & validation guide.

  - `dj-form`: `submit()` now checks the named controls and does not emit `dj-submit` while one is invalid (set `novalidate` to skip the check). An unchecked checkbox or switch and disabled controls are left out of the data, a name used by several checked controls gives an array, and Enter in a text area no longer submits.
  - `dj-checkbox`, `dj-switch`, `dj-radio`: a form reset returns them to their checked state from the markup. Before, a box checked by the user stayed checked.
  - `dj-text-input` and the inputs built on it: `setCustomValidity()` now works. Before, the message was cleared at once.
  - `dj-text-input`, `dj-text-area`: after a failed submit or `checkValidity()`, the field shows its invalid state and message without waiting for an edit.
  - `dj-checkbox-group`: a `value` set from code now reaches the form, and the group supports `required`.
  - Every form control now has `validationMessage`, `checkValidity()`, and `reportValidity()`. The "required" messages of `dj-select`, `dj-radio-group`, `dj-typeahead`, and `dj-checkbox-group` are localized through `@dojo-ng/i18n`, and `dj-checkbox` and `dj-native-select` use the browser's own message.

- Updated dependencies
  - @dojo-ng/dojo-element@0.1.3
  - @dojo-ng/text-input@0.1.2

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/list@0.1.2
  - @dojo-ng/popup@0.1.1
  - @dojo-ng/text-input@0.1.1
