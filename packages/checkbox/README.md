# @dojo-ng/checkbox

`<dj-checkbox>` — A form-associated checkbox composing `<dj-label>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated checkbox composing `<dj-label>`. Submits `value` (default "on") when checked, nothing when not. Mirrors required-validity to the host.

## Install

```bash
npm install @dojo-ng/checkbox
```

## Usage

Import the package to register the custom element, then use the tag.

Slot the label; listen for `change`.

```html
<dj-checkbox name="terms" value="accepted">I agree to the terms</dj-checkbox>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `checked` | checked ↻ | `boolean` | `false` |
| `value` | value | `string` | `"on"` |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Slots:** default

**Parts:** `control` (the box), `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
