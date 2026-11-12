# @dojo-ng/typeahead

`<dj-typeahead>` — An editable combobox: type to filter `options`, pick from a popup `<dj-list>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

`strict` (default true) requires the value to match an option. Composes text-input, popup, list. Form-associated. Event: `change`.

Coming from Dojo's **ComboBox**? Typeahead is its successor: an editable field that filters a list. For multi-select, see [`@dojo-ng/chip-typeahead`](../chip-typeahead/README.md).

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

## Long lists

- The popup list is virtual above 200 options, and filtering 10,000 options keeps up with typing.
- The popup opens with the selected option in view.

## Options from a server: `remote`

- With `remote`, the typeahead does not filter `options` itself. Typing emits `dj-options-request` (detail `{ query, offset, epoch }`) after `request-delay` ms (default 200) without a keystroke, and scrolling near the end of the list asks for the next page with `offset` set to the number of options loaded.
- Answer with `setOptions(options, { epoch, total, append })`, passing back the request's `epoch`. An answer with an older epoch is dropped and `setOptions` returns false, so a slow answer to an earlier query never replaces a newer one. You never need to cancel a request.
- `selectedOptions` holds `{ value, label }` for a selected value whose option is not loaded, so the field shows its label. The typeahead adds to it when the user chooses.
- While a request is out the list shows a spinner and announces "Loading options".

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
| `remote` | remote ↻ | `boolean` | `false` |
| `requestDelay` | request-delay | `number` | `200` |
| `selectedOptions` | selected-options | `ListOption[]` | `[]` |

## Events

- `change`

## Methods

- `checkValidity(): boolean`
- `focus(o: FocusOptions)`
- `setOptions(options: ListOption[], init: SetOptionsInit): boolean`: Remote mode: answer a `dj-options-request`. Returns false, and changes nothing, when `epoch` is not the current one.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
