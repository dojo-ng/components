# @dojo-ng/select

`<dj-select>` — A form-associated select: a trigger shows the selection, and opening it shows a `<dj-list>` of `options` in a `<dj-popup>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

ARIA combobox and listbox.

## Install

```bash
npm install @dojo-ng/select
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `options`; read the choice from the `change` event.

```html
<dj-select label="Fruit" id="fruit"></dj-select>
<script type="module">
  import "@dojo-ng/select";
  const el = document.getElementById("fruit");
  el.options = [{ value: "a", label: "Apple" }, { value: "b", label: "Banana" }];
  el.addEventListener("change", () => console.log(el.value));
</script>
```

## Single selection

- Click, ArrowDown, Enter, or Space on the trigger opens the list, with the selected option active and in view.
- Choosing, Escape, and a click outside close it and return focus to the trigger; tabbing away closes it and leaves focus where it went.

## Multiple selection: `multiple`

- `value` is a string array. Choosing toggles an option and the list stays open.
- Selected values show as chips in the trigger, each with a remove button. Backspace on the trigger removes the last one. Chips that do not fit collapse to "+N", and the trigger's accessible name lists every selected label.
- `select-all` adds a "Select all" row at the top.
- `required` means at least one value.
- The form value has one entry per value under `name`; `dj-form` gives the array under `name`. In markup, give starting values as JSON: `value='["a","b"]'`.
- For free entry of new tags, use `dj-chip-typeahead` instead.

## Long lists

- The list is virtual above its threshold (200 options), so thousands of options are fine.

## Options from a server: `remote`

- With `remote`, the select emits `dj-options-request` (detail `{ query, offset, epoch }`) when it first opens with no options, and again with `offset` set to the number loaded when the user scrolls near the end.
- Answer with `setOptions(options, { epoch, total, append })`, passing back the request's `epoch`. An answer with an older epoch is dropped and `setOptions` returns false. `append` adds a page after the loaded options; `total`, when known, stops paging there.
- `selectedOptions` holds `{ value, label }` for selected values whose option is not loaded, so the trigger can show their labels. The select adds to it as the user chooses.
- While a request is out the list shows a spinner and announces "Loading options".

Changing `required` revalidates at once. Composes label, helper-text, icon, popup, list. Parts: `label`, `trigger`, `chip`, `more`, `helper-text`.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `open` | open ↻ | `boolean` | `false` |
| `multiple` | multiple ↻ | `boolean` | `false` |
| `selectAll` | select-all | `boolean` | `false` |
| `remote` | remote ↻ | `boolean` | `false` |
| `selectedOptions` | selected-options | `ListOption[]` | `[]` |

## CSS parts

- `label`
- `trigger`
- `chip`
- `more`
- `helper-text`

## Events

- `change`

## Methods

- `checkValidity(): boolean`
- `reportValidity(): boolean`
- `restoreFormState(state: File | string | FormData | null)`
- `focus(o: FocusOptions)`
- `setOptions(options: ListOption[], init: SetOptionsInit): boolean`: Remote mode: answer a `dj-options-request`. Returns false, and changes nothing, when `epoch` is not the current one.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
