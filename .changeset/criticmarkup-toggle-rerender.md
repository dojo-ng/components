---
"@dojo-ng/rich-text-criticmarkup": patch
---

Fix the suggest-edits toolbar button not visibly updating on the click that toggles it.
`isSuggestionMode` lives in a `WeakMap` entirely outside Lexical's own editor state, so neither of
`dj-rich-text`'s two built-in re-render triggers (an editor update, a selection change) ever fires
from this click — the internal state flipped correctly, but `aria-pressed` and the `kind="outlined"`
active styling stayed stale until some unrelated later action happened to re-render the toolbar.
Fixed with `ctx.host.requestUpdate()`, the mechanism `RichTextContext.host`'s own doc comment names
for exactly this case. New browser test asserts the DOM immediately after one click and nothing
else, so this class of false pass (a manual check that clicked the button and then did something
else right after) cannot recur unnoticed.
