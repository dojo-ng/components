# @dojo-ng/text-area

`<dj-text-area>` — A form-associated multi-line text field, composing `<dj-label>` and `<dj-helper-text>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated multi-line text field, composing `<dj-label>` and `<dj-helper-text>`. Same form/validity model as `<dj-text-input>`.

## Install

```bash
npm install @dojo-ng/text-area
```

## Usage

Import the package to register the custom element, then use the tag.

Set `rows` for the initial height.

```html
<dj-text-area label="Notes" rows="4" maxlength="500"></dj-text-area>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `rows` | rows | `number` | `3` |
| `cols` | cols | `number` | — |
| `wrap` | wrap | `"hard" \| "soft" \| "off"` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `minlength` | minlength | `number` | — |
| `maxlength` | maxlength | `number` | — |

**Parts:** `label`, `control`, `input`, `helper-text`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `setCustomValidity(message: string)`, `focus(options: FocusOptions)`, `blur()`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
