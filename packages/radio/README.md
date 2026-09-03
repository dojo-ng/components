# @dojo-ng/radio

`<dj-radio>` — A form-associated radio composing `<dj-label>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated radio composing `<dj-label>`. Radios sharing a `name` within the same form (or document) are mutually exclusive: checking one unchecks the others. Submits `value` when checked. Parts: `control`, `label`. Event: `change`.

## Install

```bash
npm install @dojo-ng/radio
```

## Usage

Import the package to register the custom element, then use the tag.

Radios sharing a `name` are mutually exclusive. Prefer `dj-radio-group` for a managed set.

```html
<dj-radio name="plan" value="free" checked>Free</dj-radio>
<dj-radio name="plan" value="pro">Pro</dj-radio>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `checked` | checked ↻ | `boolean` | `false` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `tabbable` | tabbable | `boolean` | `true` |

**Slots:** default

**Parts:** `control`, `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
