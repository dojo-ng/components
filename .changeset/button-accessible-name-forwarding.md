---
"@dojo-ng/button": patch
---

Forward `aria-label`, `aria-pressed`, and `aria-expanded` from `<dj-button>` to the native button inside its shadow root. Previously an icon-only button (an `aria-hidden` icon with no visible text) had no accessible name at all — a custom-element host is not the button in the accessibility tree, so an `aria-label` left only on the host named nothing and axe reported both `button-name` and `aria-prohibited-attr`. `aria-labelledby`, `aria-describedby`, and `aria-controls` are deliberately not forwarded, since those IDREFs cannot resolve across the shadow boundary.
