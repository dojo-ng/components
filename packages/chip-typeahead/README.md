# @dojo-ng/chip-typeahead

`<dj-chip-typeahead>` — Multi-select typeahead: type to filter `options`, pick from the popup `<dj-list>`, selections render as removable `<dj-chip>`s.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Multi-select typeahead: type to filter `options`, pick from the popup `<dj-list>`, selections render as removable `<dj-chip>`s. Backspace on an empty input removes the last chip. Form-associated (submits each value under `name`). Composes chip, list, popup, label. Event: `change` (detail: selected values).

## Install

```bash
npm install @dojo-ng/chip-typeahead
```

## Usage

Import the package to register the custom element, then use the tag.

Selections render as removable chips; submits each value under `name`.

```html
<dj-chip-typeahead label="Tags" name="tags" id="ct"></dj-chip-typeahead>
<script type="module">
  import "@dojo-ng/chip-typeahead";
  document.getElementById("ct").options = [
    { value: "red", label: "Red" }, { value: "green", label: "Green" }, { value: "blue", label: "Blue" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string[]` | `[]` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `duplicates` | duplicates | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |

**Parts:** `label`, `box`

**Events:** `change` (detail: selected values)

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
