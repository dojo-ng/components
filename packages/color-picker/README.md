# @dojo-ng/color-picker

`<dj-color-picker>` — An inline color picker with a 2D saturation/brightness area, a hue slider, an optional opacity slider, a text field, and optional swatches.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

An inline color picker with a 2D saturation/brightness area, a hue slider, an optional opacity slider, a text field, and optional swatches. Form-associated: it submits the formatted color string under `name`. There is no built-in trigger or popup — compose `dj-popup` to make it a dropdown. The internal model is HSV + alpha; `value` is a color STRING formatted through `format` (`hex`/`rgb`/`hsl`). Parts: `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`.

> An inline color picker: a 2D saturation/brightness area, a hue slider, an optional opacity slider (`alpha`), a text field, and optional `swatches`. Form-associated — it submits the formatted color string under `name`. There is no built-in trigger or popup by design; compose `dj-popup` to make a dropdown. The model is HSV internally; `value` is a color STRING formatted through `format` (`hex`/`rgb`/`hsl`), so reading `value` after switching `format` returns the new representation. `swatches` is an array of color strings or `{ value, label }`. Emits `dj-change` (`{ value }`) on every user change, including during a drag (no separate input event). Named CSS colors are not parsed; alpha appears in the output only when the color is translucent or `alpha` is on. Parts: `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`.

## Install

```bash
npm install @dojo-ng/color-picker
```

## Usage

Import the package to register the custom element, then use the tag.

Set `format`, turn on `alpha` for opacity, and pass `swatches`. Listen for `dj-change` to read the formatted `value`.

```html
<dj-color-picker id="picker" label="Brand color" format="rgb" alpha></dj-color-picker>
<script type="module">
  import "@dojo-ng/color-picker";
  const p = document.getElementById("picker");
  p.swatches = ["#e11d48", "#2563eb", { value: "#16a34a", label: "Green" }];
  p.addEventListener("dj-change", (e) => console.log(e.detail.value));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `format` | format | `ColorFormat` | `"hex"` |
| `alpha` | alpha ↻ | `boolean` | `false` |
| `swatches` | — | `Swatch[]` | `[]` |
| `label` | label | `string` | — |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `get` | get | `string` | — |

**Parts:** `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`, `picker`, `label`

**Events:** `dj-change` (`{ value }`)

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`

**CSS properties:** `--dj-color-picker-width` (default `240px`; Overall width of the inline panel.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
