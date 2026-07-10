# @dojo-ng/chip-typeahead

`<dj-chip-typeahead>` — Multi-select typeahead: type to filter `options`, pick from the popup `<dj-list>`, selections render as removable `<dj-chip>`s.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Multi-select typeahead: type to filter `options`, pick from the popup `<dj-list>`, selections render as removable `<dj-chip>`s. Backspace on an empty input removes the last chip. Form-associated (submits each value under `name`). Composes chip, list, popup, label. Event: `change` (detail: selected values). With `allow-new`, Enter on non-empty input text creates a chip from the literal trimmed value (a free-text tag), unless the popup has an active (highlighted) option — that keeps picking. New values respect `duplicates`, clear the input, and join the form value like picked ones. Only Enter commits; comma is left alone (it is a valid character in many locales).

> By default only configured `options` can be chosen. Add `allow-new` for a tag editor: Enter on non-empty text that matches no option creates a chip from the literal value (respecting `duplicates`), while a highlighted popup option still picks the option. Only Enter commits — comma is left alone, since it is a valid character in many locales.

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
| `allowNew` | allow-new ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |

**Parts:** `label`, `box`

**Events:** `change` (detail: selected values)

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`

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

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
