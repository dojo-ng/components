---
"@dojo-ng/nav": minor
---

Add `track`. A plain click on a link to a page of the same app navigates through `@dojo-ng/history`, the link for the current page gets `aria-current="page"`, and a collapsed panel closes with focus returning to the trigger. Needs `@dojo-ng/history` installed; without it the nav behaves as before.
