---
"@dojo-ng/breadcrumb-group": minor
---

Add `track` and `resolveTitle`. With `track`, the crumbs come from the navigation location's trail (or from its path), a plain click on a crumb navigates through `@dojo-ng/history`, and `items` is ignored. The landmark name is now translated, and the separator is drawn from `--dj-breadcrumb-separator`. Needs `@dojo-ng/history` installed for `track`; without it the group behaves as before.
