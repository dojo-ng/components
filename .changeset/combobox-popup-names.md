---
"@dojo-ng/typeahead": patch
"@dojo-ng/chip-typeahead": patch
---

Fix two accessibility violations when the suggestion popup is open in `dj-typeahead` and `dj-chip-typeahead`: the combobox now points `aria-controls` at the suggestion list, and the list has an accessible name ("Suggestions", localizable through the `dj` i18n namespace). `dj-chip-typeahead` gains a dependency on `@dojo-ng/i18n` for the label.
