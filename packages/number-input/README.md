# @dojo-ng/number-input

`<dj-number-input>` — A text input defaulting to `type="number"`; exposes `valueAsNumber`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Extends `DjTextInput` and inherits its properties and behavior.

## Install

```bash
npm install @dojo-ng/number-input
```

## Usage

Import the package to register the custom element, then use the tag.

`min`, `max`, and `step` constrain the value.

```html
<dj-number-input label="Quantity" min="1" max="99" step="1" value="1"></dj-number-input>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `TextInputType` | `"number"` |

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
