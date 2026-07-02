# @dojo-ng/checkbox-group

`<dj-checkbox-group>` — Multi-select group from `options`; submits each checked value under `name`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/checkbox-group
```

## Usage

Import the package to register the custom element, then use the tag.

Submits each checked value under `name`.

```html
<dj-checkbox-group label="Toppings" name="toppings" id="tg"></dj-checkbox-group>
<script type="module">
  import "@dojo-ng/checkbox-group";
  document.getElementById("tg").options = [
    { value: "cheese", label: "Cheese" }, { value: "olives", label: "Olives" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `CheckboxOption[]` | `[]` |
| `value` | value | `string[]` | `[]` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `orientation` | orientation | `"vertical"\|"horizontal"` | `"vertical"` |
| `disabled` | disabled | `boolean` | `false` |

**Events:** `change`

**Methods:** `checkValidity()`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
