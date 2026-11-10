---
"@dojo-ng/i18n": patch
---

Fix lazy-loaded translations and several locale bugs (CB23).

- Components re-render when translations are registered or loaded after they first rendered. `MessageStore` has a new `subscribe(listener)` (batched per task), and `LocaleController` uses it.
- `messages.load(ns, locale)` now loads every locale in the lookup chain that is missing, so `load("dj", "fr-CA")` also fetches `fr`. The loader gets the tag in its original case.
- The lookup chain includes every shorter form of a tag: `zh-Hant-TW` tries `zh-hant-tw`, `zh-hant`, then `zh`. Before, `zh-hant` was skipped.
- `lang="en_US"` is read as `en-US`, and the `Intl` helpers fall back to the default locale for a tag `Intl` rejects instead of throwing. New `normalizeLocale()` export.
- `formatDate("2026-11-10")` shows that calendar day in every time zone. Before, it was a day early west of UTC.
