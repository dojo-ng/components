---
"@dojo-ng/dojo-element": patch
---

Fix the focus trap used by `dj-dialog` and `dj-slide-pane` (CB29). It no longer counts elements the user cannot reach as Tab stops: hidden or inert elements, ones inside `display: none` or a closed `<details>`, `visibility: hidden`, `input[type=hidden]`, and anything with a negative `tabindex`. A hidden last stop used to make the wrap fail, so Tab left the dialog. It now counts `contenteditable` elements and a `<details>` summary, which it missed. If a stop still refuses focus when Tab wraps, the trap moves on to the next one instead of letting focus escape.
