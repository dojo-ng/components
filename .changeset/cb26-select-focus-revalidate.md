---
"@dojo-ng/select": patch
"@dojo-ng/text-input": patch
"@dojo-ng/text-area": patch
---

`dj-select` returns focus to its trigger when Escape or a click outside closes the list, instead of dropping it on the page body, and revalidates when `required` changes (CB26). `dj-text-input` revalidates when `required`, `pattern`, `min`, `max`, `step`, `minlength`, `maxlength` or `type` changes, and `dj-text-area` when `required`, `minlength` or `maxlength` changes, so `validity` and the form agree at once.
