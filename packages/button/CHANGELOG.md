# @dojo-ng/button

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2

## 0.1.1

### Patch Changes

- Forward `aria-label`, `aria-pressed`, and `aria-expanded` from `<dj-button>` to the native button inside its shadow root. Previously an icon-only button (an `aria-hidden` icon with no visible text) had no accessible name at all — a custom-element host is not the button in the accessibility tree, so an `aria-label` left only on the host named nothing and axe reported both `button-name` and `aria-prohibited-attr`. `aria-labelledby`, `aria-describedby`, and `aria-controls` are deliberately not forwarded, since those IDREFs cannot resolve across the shadow boundary.
