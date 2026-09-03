# @dojo-ng/time-picker

`<dj-time-picker>` — A `HH:MM` time field with a popup list of options generated from `min`/`max`/`step` (seconds).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A `HH:MM` time field with a popup list of options generated from `min`/`max`/`step` (seconds). `format` 24|12 controls option labels. Form-associated.

## Install

```bash
npm install @dojo-ng/time-picker
```

## Usage

Import the package to register the custom element, then use the tag.

`step` (seconds) controls the option interval; `format` is 12 or 24.

```html
<dj-time-picker label="Start time" step="1800" format="12"></dj-time-picker>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `min` | min | `string` | `"00:00"` |
| `max` | max | `string` | `"23:59"` |
| `step` | step | `number` | `1800` |
| `format` | format | `"24"\|"12"` | `"24"` |
| `disabled` | disabled | `boolean` | `false` |
| `required` | required | `boolean` | `false` |

**Events:** `change`

**Methods:** `checkValidity()`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
