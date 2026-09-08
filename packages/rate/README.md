# @dojo-ng/rate

`<dj-rate>` — Star rating (0..max).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Star rating (0..max). Form-associated. (Half-step `allowHalf` accepted; full-star core.)

## Install

```bash
npm install @dojo-ng/rate
```

## Usage

Import the package to register the custom element, then use the tag.

0..max stars; form-associated.

```html
<dj-rate name="score" max="5" value="3"></dj-rate>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `max` | max | `number` | `5` |
| `value` | value | `number` | `0` |
| `allowHalf` | allow-half | `boolean` | `false` |
| `readonly` | readonly | `boolean` | `false` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |

**Events:** `change`

**Methods:** `checkValidity()`, `restoreFormState(state: File | string | FormData | null)`

**CSS properties:** `--dj-rate-size` (default `1.5rem`; Size of one star.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
