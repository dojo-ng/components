# @dojo-ng/theme

`<dj-theme>` — Scopes a theme to part of the page.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Set `theme` to `light` or `dark`. dj-theme sets `data-dj-theme` on itself, so the token rules in `theme.css` apply, and the tokens inherit into descendants and their shadow roots.

- `auto` removes the attribute. The subtree then follows the surrounding theme, or the operating system setting at the page root.
- Load `theme.css` once for the page.

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

## Slots

- default slot

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
