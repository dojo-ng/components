# @dojo-ng/range-slider

`<dj-range-slider>` — A form-associated dual-thumb range.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated dual-thumb range. Two overlaid native ranges keep `valueMin <= valueMax`. Submits two form entries (`<name>_min`, `<name>_max`). `value` getter returns `{ min, max }`. Composes `<dj-label>`. Event: `change` (detail `{min,max}`).

## Install

```bash
npm install @dojo-ng/range-slider
```

## Usage

Import the package to register the custom element, then use the tag.

Reads back as `{ min, max }`; submits `<name>_min` and `<name>_max`.

```html
<dj-range-slider label="Price" name="price" min="0" max="500" value-min="100" value-max="400" show-output></dj-range-slider>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `min` | min | `number` | `0` |
| `max` | max | `number` | `100` |
| `step` | step | `number` | `1` |
| `valueMin` | value-min | `number` | `0` |
| `valueMax` | value-max | `number` | `100` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `showOutput` | show-output | `boolean` | `false` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Parts:** `label`, `track`, `fill`, `output`

**Events:** `change` (detail `{min,max}`)

**Methods:** `checkValidity(): boolean`, `restoreFormState(state: File | string | FormData | null)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
