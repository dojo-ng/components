# @dojo-ng/chip-typeahead

`<dj-chip-typeahead>` — A multi-select typeahead: type to filter `options`, pick from a popup list, and each choice becomes a removable chip.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

It is form-associated and submits each value under `name`. It is built from `dj-chip`, `dj-list`, `dj-popup`, and `dj-label`.

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

## Choosing values

- Typing filters `options`; picking one from the popup adds it as a chip.
- Backspace in an empty input removes the last chip.
- The `change` event fires with the selected values.

## Free-text tags: `allow-new`

- By default only the configured `options` can be chosen.
- With `allow-new`, Enter on text that matches no option creates a chip from that text, trimmed. If an option in the popup is highlighted, Enter picks that option instead.
- New values follow `duplicates`, clear the input, and join the form value like picked ones.
- Only Enter adds a value. Comma does not, because a comma is a normal character in many languages.

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
| `allowNew` | allow-new ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |

## CSS parts

- `label`
- `box`

## Events

- `change`: Detail: selected values.

## Methods

- `checkValidity(): boolean`
- `focus(o: FocusOptions)`
- `restoreFormState(state: File | string | FormData | null)`

## Examples

### Free-text tag editor (`allow-new`)

With `allow-new`, Enter on text that matches no option creates a chip from the literal value, so users can add tags that are not in the list. Suggestions still work: a highlighted option is picked instead of creating a literal.

```html
<dj-chip-typeahead allow-new label="Tags" name="tags" id="tags"></dj-chip-typeahead>
<script type="module">
  import "@dojo-ng/chip-typeahead";
  document.getElementById("tags").options = [
    { value: "urgent", label: "urgent" }, { value: "later", label: "later" },
  ];
  // Type "roadmap" and press Enter to add a brand-new tag.
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
