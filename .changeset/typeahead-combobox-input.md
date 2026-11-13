---
"@dojo-ng/text-input": patch
"@dojo-ng/typeahead": patch
---

`dj-typeahead`'s combobox role, `aria-expanded`, and `aria-autocomplete` now sit on the input that has focus, not on the `dj-text-input` element around it, so a screen reader announces a combobox instead of a plain text field. The input points at the suggestion list with `ariaControlsElements`, since an `aria-controls` id cannot reach from inside `dj-text-input` into the typeahead's shadow root. `dj-text-input` gains a `combobox` property (`{ controls, expanded }`) for this.
