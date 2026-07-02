# @dojo-ng/date-input

`<dj-date-input>` — An ISO (yyyy-mm-dd) date field: type it, or pick from a popup `<dj-calendar>` opened by the trailing button.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

An ISO (yyyy-mm-dd) date field: type it, or pick from a popup `<dj-calendar>` opened by the trailing button. Form-associated. Composes text-input, calendar, popup, icon.

## Install

```bash
npm install @dojo-ng/date-input
```

## Usage

Import the package to register the custom element, then use the tag.

Type `yyyy-mm-dd` or pick from the popup calendar.

```html
<dj-date-input label="Start date" value="2026-06-15"></dj-date-input>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `min` | min | `string` | — |
| `max` | max | `string` | — |
| `disabled` | disabled | `boolean` | `false` |
| `required` | required | `boolean` | `false` |

**Events:** `change`

**Methods:** `checkValidity()`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
