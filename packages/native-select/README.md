# @dojo-ng/native-select

`<dj-native-select>` — A form-associated wrapper over a native `<select>`, driven by an `options` array, composing `<dj-label>`, `<dj-helper-text>`, and a `<dj-icon>` chevron.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated wrapper over a native `<select>`, driven by an `options` array, composing `<dj-label>`, `<dj-helper-text>`, and a `<dj-icon>` chevron. A blank option is prepended while nothing is selected. Parts: `label`, `control`, `select`, `helper-text`.

## Install

```bash
npm install @dojo-ng/native-select
```

## Usage

Import the package to register the custom element, then use the tag.

Drive the native select from an `options` array.

```html
<dj-native-select label="Country" id="country"></dj-native-select>
<script type="module">
  import "@dojo-ng/native-select";
  document.getElementById("country").options = [
    { value: "us", label: "United States" },
    { value: "ca", label: "Canada" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `options` | options | `MenuOption[]` | `[]` |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `placeholder` | placeholder | `string` | — |
| `size` | size | `number` | — |

**Parts:** `label`, `control`, `select`, `helper-text`, `arrow`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
