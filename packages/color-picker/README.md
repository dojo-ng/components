# @dojo-ng/color-picker

`<dj-color-picker>` — An inline color picker.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

It has a saturation and brightness area, a hue slider, an optional opacity slider (`alpha`), a text field, and optional `swatches`.

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

## Value and format

- `value` is a color string in the `format` you choose: `hex`, `rgb`, or `hsl`.
- The internal model is HSV plus alpha. After you change `format`, reading `value` returns the new representation.
- Alpha appears in the output only when the color is translucent or `alpha` is on.
- Named CSS colors, such as `rebeccapurple`, are not parsed.
- `dj-change` (`{ value }`) fires on every change the user makes, including during a drag. There is no separate input event.

## Forms

- The picker is form-associated. It submits the formatted color string under `name`.

## Swatches

- `swatches` is an array of color strings or `{ value, label }` objects.

## Dropdowns

- There is no built-in trigger button or popup. Put the picker in a `dj-popup` to make a dropdown.

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

## CSS parts

- `area`
- `thumb`
- `hue`
- `alpha`
- `input`
- `swatches`
- `swatch`
- `picker`
- `label`

## Events

- `dj-change`: `{ value }`.

## Methods

- `checkValidity(): boolean`
- `reportValidity(): boolean`

## CSS custom properties

- `--dj-color-picker-width`: Overall width of the inline panel. Default `240px`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
