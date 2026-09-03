# @dojo-ng/slider

`<dj-slider>` — A form-associated single-value range input with a themed track/fill/thumb and optional output, composing `<dj-label>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated single-value range input with a themed track/fill/thumb and optional output, composing `<dj-label>`. Parts: `label`, `track`, `fill`, `input`, `output`.

## Install

```bash
npm install @dojo-ng/slider
```

## Usage

Import the package to register the custom element, then use the tag.

`show-output` displays the current value.

```html
<dj-slider label="Volume" min="0" max="100" value="40" show-output></dj-slider>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `min` | min | `number` | `0` |
| `max` | max | `number` | `100` |
| `step` | step | `number` | `1` |
| `value` | value | `number` | `0` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `showOutput` | show-output | `boolean` | `true` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Parts:** `label`, `track`, `fill`, `input`, `output`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
