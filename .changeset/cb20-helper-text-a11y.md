---
"@dojo-ng/helper-text": patch
"@dojo-ng/text-input": patch
"@dojo-ng/text-area": patch
"@dojo-ng/select": patch
"@dojo-ng/native-select": patch
---

Screen readers now read helper and error text (CB20).

- `dj-helper-text` no longer hides its text with `aria-hidden`.
- `dj-text-input`, `dj-text-area`, `dj-select`, and `dj-native-select` point their native control's `aria-describedby` at the helper text, so it is read as the control's description. When a text input or text area is invalid, the error message is read instead. Controls without helper text set no `aria-describedby`.
- `dj-select` now sets `aria-invalid` on its trigger when invalid, like the other controls.
