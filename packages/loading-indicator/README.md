# @dojo-ng/loading-indicator

`<dj-loading-indicator>` — A linear bar or circular spinner.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A linear bar or circular spinner. `active` (default true) toggles visibility while preserving layout. Exposes role="progressbar".

## Install

```bash
npm install @dojo-ng/loading-indicator
```

## Usage

Import the package to register the custom element, then use the tag.

Pick a `type` (e.g. circular).

```html
<dj-loading-indicator type="circular-small"></dj-loading-indicator>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `active` | active ↻ | `boolean` | `true` |
| `type` | type ↻ | `LoadingType` | `"linear"` |
| `label` | label | `string` | — |

**Parts:** `base`

**CSS properties:** `--dj-loading-linear-height` (default `4px`; Thickness of the linear (bar) indicator.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
