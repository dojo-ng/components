# @dojo-ng/select

`<dj-select>` — A form-associated single-select combobox.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated single-select combobox. A trigger shows the selected option; clicking (or ArrowDown/Enter/Space) opens a `<dj-popup>` containing a `<dj-list>` of `options`. Selecting sets `value`, closes, and returns focus. ARIA combobox/listbox. Composes label, helper-text, icon, popup, list. Parts: `label`, `trigger`, `helper-text`.

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

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `open` | open ↻ | `boolean` | `false` |

**Parts:** `label`, `trigger`, `helper-text`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(o: FocusOptions)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
