---
"@dojo-ng/dojo-element": patch
---

New export `isTextEntryTarget(e)`: true when a key event started in a text input, textarea, select, contenteditable element, or an element with role textbox, searchbox or combobox. It reads the composed target, so the native input inside a `dj-text-input` counts. Composite widgets call it first in their key handlers so typed keys reach the control.
