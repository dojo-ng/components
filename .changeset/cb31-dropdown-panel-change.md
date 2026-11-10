---
"@dojo-ng/dropdown": patch
---

`dj-dropdown` no longer closes on a `change` from any input in its panel (CB31). Only a choice from the menu list closes it, so a panel with a text field, checkbox, or select stays open while the user works in it.
