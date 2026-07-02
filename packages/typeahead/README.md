# @dojo-ng/typeahead

`<dj-typeahead>` — An editable combobox: type to filter `options`, pick from a popup `<dj-list>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

An editable combobox: type to filter `options`, pick from a popup `<dj-list>`. `strict` (default true) requires the value to match an option. Composes text-input, popup, list. Form-associated. Event: `change`.

> Coming from Dojo's **ComboBox**? Typeahead is its successor: an editable field that filters a list. For multi-select, see [`@dojo-ng/chip-typeahead`](../chip-typeahead/README.md).

## Install

```bash
npm install @dojo-ng/typeahead
```

## Usage

Import the package to register the custom element, then use the tag.

`strict` (default) requires the value to match an option.

```html
<dj-typeahead label="Search fruit" id="ta"></dj-typeahead>
<script type="module">
  import "@dojo-ng/typeahead";
  document.getElementById("ta").options = [
    { value: "apple", label: "Apple" }, { value: "apricot", label: "Apricot" }, { value: "banana", label: "Banana" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `helperText` | helper-text | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `strict` | strict | `boolean` | `true` |
| `position` | position ↻ | `PopupPosition` | `"below"` |

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
