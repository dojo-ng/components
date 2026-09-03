# @dojo-ng/action-button

`<dj-action-button>` — A button that inherits the surrounding theme rather than imposing its own.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Extends `DjButton` and inherits its properties and behavior.

A button that inherits the surrounding theme rather than imposing its own. Mirrors the Dojo `action-button`, which renders `Button` with `variant="inherit"`. Because --dj-* tokens inherit through the shadow boundary, subclassing DjButton with no token overrides already yields inherited theming.

## Install

```bash
npm install @dojo-ng/action-button
```

## Usage

Import the package to register the custom element, then use the tag.

Renders without imposing its own color, inheriting `--dj-*` tokens from context.

```html
<dj-action-button>Inherit colors</dj-action-button>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
