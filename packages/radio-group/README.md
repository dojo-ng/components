# @dojo-ng/radio-group

`<dj-radio-group>` — Coordinates a set of `<dj-radio>` into a single-choice control.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Coordinates a set of `<dj-radio>` into a single-choice control. Provide choices either with the `options` array (rendered for you) or by slotting `<dj-radio>` children. The group owns selection (exclusivity), roving-arrow keyboard navigation, and form participation: it is the one form-associated element, submitting the selected `value` under `name`. Child radios should not carry their own `name`. This is local parent-child coordination, so it uses DOM, properties, and events — no external store needed.

## Install

```bash
npm install @dojo-ng/radio-group
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `options`; the group owns selection and form participation.

```html
<dj-radio-group label="Size" name="size" value="m" id="rg"></dj-radio-group>
<script type="module">
  import "@dojo-ng/radio-group";
  document.getElementById("rg").options = [
    { value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `name` | name ↻ | `string` | — |
| `value` | value | `string` | `""` |
| `options` | options | `RadioOption[]` | — |
| `label` | label | `string` | — |
| `orientation` | orientation ↻ | `"vertical" \| "horizontal"` | `"vertical"` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |

**Slots:** default

**Parts:** `group`, `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
