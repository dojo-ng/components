# @dojo-ng/theme

`<dj-theme>` — `<dj-theme theme="dark">` — scopes a theme to a subtree.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

`<dj-theme theme="dark">` — scopes a theme to a subtree. It sets `data-dj-theme` on itself so the token rules in `theme.css` apply, and those tokens inherit through the slot into descendants and their shadow roots. `auto` removes the attribute so the subtree inherits the ambient theme (or the OS via prefers-color-scheme at the root). Requires `theme.css` to be loaded once at the page level.

## Install

```bash
npm install @dojo-ng/theme
```

## Usage

Import the package to register the custom element, then use the tag.

Force a theme for a subtree.

```html
<dj-theme theme="dark">
  <dj-button>Always dark</dj-button>
</dj-theme>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `theme` | theme | `ThemeName` | `"auto"` |

**Slots:** default

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
