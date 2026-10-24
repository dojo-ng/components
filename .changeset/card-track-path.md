---
"@dojo-ng/card": minor
---

Add `path` and `track`. With `path` set, the card renders as a real link (`<a href>`) and dispatches `dj-navigate`; with `track` it also follows `nav:location` and shows `aria-current="page"` when it is the current page. Needs `@dojo-ng/history` installed to do either; without it the card behaves as before.
