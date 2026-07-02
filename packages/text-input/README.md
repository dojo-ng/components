# @dojo-ng/text-input

`<dj-text-input>` — A form-associated text field that composes `<dj-label>` and `<dj-helper-text>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated text field that composes `<dj-label>` and `<dj-helper-text>`. It participates in native forms via ElementInternals: it sets its form value and mirrors the inner input's constraint validity to the host.

## Install

```bash
npm install @dojo-ng/text-input
```

## Usage

Import the package to register the custom element, then use the tag.

Set `label`, `required`, and read the value from the `input` event.

```html
<dj-text-input label="Email" type="email" required helper-text="We never share it"></dj-text-input>
<script type="module">
  import "@dojo-ng/text-input";
  document.querySelector("dj-text-input").addEventListener("input", (e) => console.log(e.target.value));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `type` | type | `TextInputType` | `"text"` |
| `name` | name ↻ | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `autocomplete` | autocomplete | `string` | — |
| `pattern` | pattern | `string` | — |
| `min` | min | `string` | — |
| `max` | max | `string` | — |
| `step` | step | `string` | — |
| `minlength` | minlength | `number` | — |
| `maxlength` | maxlength | `number` | — |

**Slots:** `leading`, `trailing`

**Parts:** `label`, `control`, `input`, `helper-text`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `setCustomValidity(message: string)`, `focus(options: FocusOptions)`, `blur()`

## Examples

### Leading and trailing slots

Add affixes around the field.

```html
<dj-text-input label="Amount">
  <span slot="leading">$</span>
  <span slot="trailing">.00</span>
</dj-text-input>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
