# @dojo-ng/progress

`<dj-progress>` — Determinate progress bar.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Determinate progress bar. value within min..max; `show-output` shows percent. Part: `bar`. @cssprop [--dj-progress-height=8px] - Thickness of the progress bar.

## Install

```bash
npm install @dojo-ng/progress
```

## Usage

Import the package to register the custom element, then use the tag.

`show-output` prints the percentage.

```html
<dj-progress value="65" show-output></dj-progress>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `min` | min | `number` | `0` |
| `max` | max | `number` | `100` |
| `value` | value | `number` | `0` |
| `showOutput` | show-output | `boolean` | `false` |

**Parts:** `bar`

**CSS properties:** `--dj-progress-height` (default `8px`; Thickness of the progress bar.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
