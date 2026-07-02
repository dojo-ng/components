# @dojo-ng/switch

`<dj-switch>` — A form-associated on/off toggle (role="switch") composing `<dj-label>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated on/off toggle (role="switch") composing `<dj-label>`. Modeled like a checkbox; the checked flag is `checked` (the Dojo widget called it `value` — renamed here for consistency with checkbox/radio). Parts: `control`, `label`.

## Install

```bash
npm install @dojo-ng/switch
```

## Usage

Import the package to register the custom element, then use the tag.

Modeled like a checkbox; the flag is `checked`.

```html
<dj-switch name="notify" checked>Email notifications</dj-switch>
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
| `labelHidden` | label-hidden | `boolean` | `false` |

**Slots:** default

**Parts:** `control`, `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
