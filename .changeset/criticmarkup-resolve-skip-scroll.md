---
"@dojo-ng/rich-text-criticmarkup": patch
---

Fix `acceptMark`/`declineMark`/`acceptAllMarks`/`declineAllMarks` scrolling the editor to a stale
selection instead of leaving the view where the resolved mark was. Every caller of these functions
is a button click (this package's own toolbar accept/reject buttons included, and any host
application's own drawer or panel), never a caret move, so the browser's native selection has
almost always drifted to wherever the mouse last did something selectable while Lexical's own
internal selection is still sitting wherever the author was last actually typing — and Lexical's
own reconciler scrolls exactly that stale position into view whenever an update leaves the editor
root focused and the two disagree. Both resolvers now tag their `editor.update()` with Lexical's
own `"skip-scroll-into-view"` string, alongside the existing suggestion-mode skip tag, so resolving
a mark never moves the viewport on its own.
