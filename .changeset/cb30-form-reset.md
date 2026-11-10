---
"@dojo-ng/dojo-element": patch
"@dojo-ng/form": patch
"@dojo-ng/calendar": patch
"@dojo-ng/checkbox-group": patch
"@dojo-ng/chip-typeahead": patch
"@dojo-ng/date-input": patch
"@dojo-ng/list": patch
"@dojo-ng/native-select": patch
"@dojo-ng/radio-group": patch
"@dojo-ng/range-slider": patch
"@dojo-ng/rate": patch
"@dojo-ng/rich-text": patch
"@dojo-ng/select": patch
"@dojo-ng/text-area": patch
"@dojo-ng/text-input": patch
"@dojo-ng/time-picker": patch
"@dojo-ng/typeahead": patch
---

Fix form reset and `dj-form` (CB30).

- Every form control now has `defaultValue`, the `value` attribute, as on a native input. A form reset returns each control to it. Before, some controls went back to the attribute and others (`dj-select`, `dj-list`, `dj-radio-group`, `dj-time-picker`, `dj-typeahead`, `dj-rate`, `dj-checkbox-group`, `dj-chip-typeahead`, `dj-range-slider`) always went back to empty.
- `dj-form` treats only form controls as fields: `dj-*` form controls and native inputs, selects, and text areas. A named title pane, button, or icon is no longer gathered on submit or cleared on reset.
- `dj-form` submits native controls the way a native form does. A native text input was left out before, because it has a `checked` property that is always false. A multi-select now submits every selected option.
- `dj-form`'s `reset()` resets native controls the native way (a checkbox goes back to its `checked` attribute instead of having its value erased), and it clears the `user-valid`/`user-invalid` states, as a native form reset does. Form controls get a `resetInteraction()` method for this.
- A required `dj-radio-group` now shows as valid when the choice is made with the arrow keys, not only with a click.
