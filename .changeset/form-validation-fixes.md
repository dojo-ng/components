---
"@dojo-ng/form": patch
"@dojo-ng/dojo-element": patch
"@dojo-ng/text-input": patch
"@dojo-ng/text-area": patch
"@dojo-ng/checkbox": patch
"@dojo-ng/switch": patch
"@dojo-ng/radio": patch
"@dojo-ng/checkbox-group": patch
"@dojo-ng/radio-group": patch
"@dojo-ng/select": patch
"@dojo-ng/native-select": patch
"@dojo-ng/typeahead": patch
---

Fix form validation bugs found while writing the Forms & validation guide.

- `dj-form`: `submit()` now checks the named controls and does not emit `dj-submit` while one is invalid (set `novalidate` to skip the check). An unchecked checkbox or switch and disabled controls are left out of the data, a name used by several checked controls gives an array, and Enter in a text area no longer submits.
- `dj-checkbox`, `dj-switch`, `dj-radio`: a form reset returns them to their checked state from the markup. Before, a box checked by the user stayed checked.
- `dj-text-input` and the inputs built on it: `setCustomValidity()` now works. Before, the message was cleared at once.
- `dj-text-input`, `dj-text-area`: after a failed submit or `checkValidity()`, the field shows its invalid state and message without waiting for an edit.
- `dj-checkbox-group`: a `value` set from code now reaches the form, and the group supports `required`.
- Every form control now has `validationMessage`, `checkValidity()`, and `reportValidity()`. The "required" messages of `dj-select`, `dj-radio-group`, `dj-typeahead`, and `dj-checkbox-group` are localized through `@dojo-ng/i18n`, and `dj-checkbox` and `dj-native-select` use the browser's own message.
