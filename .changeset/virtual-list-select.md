---
"@dojo-ng/list": minor
"@dojo-ng/select": minor
"@dojo-ng/typeahead": minor
"@dojo-ng/chip-typeahead": patch
---

Long lists, multiple selection, and options from a server.

- `dj-list` is virtual above `virtual-threshold` rows (default 200): only the rows in view are in the DOM. The arrow keys, Home, End, PageUp, PageDown, and type-ahead by first letters cover every option, the active option is always rendered, and rendered options carry `aria-posinset` and `aria-setsize`. Rows have one height (`--dj-list-item-height`, or the first option measured once). `reorderable` is off while virtual. New `dj-scroll-end` event near the end of the list. New dependency: `@tanstack/virtual-core`; a page using an import map needs an entry for it.
- `dj-list` gains `multiple` (value is a string array; the form value has one entry per value), PageUp/PageDown, type-ahead, and makes the selected option active on focus. Its loading spinner now has an accessible name.
- `dj-select multiple`: chips in the trigger with a remove button each, Backspace removes the last, "+N" when they do not fit, the full list in the trigger's accessible name, optional `select-all` row, and `required` means at least one. Submits one entry per value; `dj-form` gives the array under the name.
- `dj-select` and `dj-typeahead` open with the selected option in view, and their popup lists scroll inside 20rem (`--dj-select-list-max-height`, `--dj-typeahead-list-max-height`). Typeahead filtering of 10,000 options keeps up with typing.
- `remote` on `dj-select` and `dj-typeahead`: the component emits `dj-options-request` (`{ query, offset, epoch }`) and the app answers with `setOptions(options, { epoch, total, append })`. Answers with an old epoch are dropped. Typeahead requests are debounced by `request-delay` (default 200 ms); the select pages when the user scrolls near the end. `selectedOptions` keeps labels for selected values that are not loaded. The loading state is announced.
- `dj-chip-typeahead` picks up the virtual popup list for long option lists.
