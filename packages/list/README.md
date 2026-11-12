# @dojo-ng/list

`<dj-list>` — A single-select list, or a menu, built from `options`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Coming from Dojo's Listbox? Use this component: it has the listbox role and keyboard model that Listbox had. The list is form-associated and submits `value`.

## Install

```bash
npm install @dojo-ng/list
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `options`; read `value` from the `change` event.

```html
<dj-list id="ls"></dj-list>
<script type="module">
  import "@dojo-ng/list";
  const el = document.getElementById("ls");
  el.options = [{ value: "a", label: "Apple" }, { value: "b", label: "Banana" }];
  el.addEventListener("change", () => console.log(el.value));
</script>
```

## Keyboard

The list is one tab stop (the active-descendant pattern).

- The arrow keys, Home, End, PageUp, and PageDown move the active item.
- Typing a letter (or the start of a label) moves to the next option whose label starts with it.
- Enter or Space selects it.
- On focus with nothing active, the selected option becomes active.

## Long lists

- Above `virtual-threshold` rows (default 200, dividers included) the list is virtual: only the rows in view plus a few either side are in the DOM. Keyboard and type-ahead still cover every option, and the active option is always rendered.
- Every row has one height, `--dj-list-item-height`, or the first option's height measured once. Labels stay on one line and are cut with an ellipsis.
- The list scrolls inside `--dj-list-max-height` (20rem by default while virtual).
- Rendered options carry `aria-posinset` and `aria-setsize`, so a screen reader reports "item 812 of 5,000".
- `dj-scroll-end` fires when the user scrolls (or moves) within a few rows of the end, once per option count. Use it to load the next page.

## Multiple selection

- With `multiple`, choosing an option toggles it, `value` is a string array, and the listbox is `aria-multiselectable`. The form value has one entry per value under `name`.
- In markup, give the starting values as a JSON array: `value='["a","b"]'`.

## Options

- `menu` switches the roles to `menu` and `menuitem`.
- `loading` shows a spinner.

## Reordering

- With `reorderable`, items can be dragged with a pointer or touch, or moved with the keyboard: Space to grab, the arrow keys to move, Space to drop, and Escape to cancel.
- Reordering is controlled: the list emits `dj-reorder`, and you reorder `options`.
- Reordering is off while the list is virtual; the list warns once in the console.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `multiple` | multiple ↻ | `boolean` | `false` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `menu` | menu | `boolean` | `false` |
| `loading` | loading | `boolean` | `false` |
| `reorderable` | reorderable ↻ | `boolean` | `false` |
| `virtualThreshold` | virtual-threshold | `number` | `200` |

## CSS parts

- `list`
- `item`
- `drop-indicator`

## Events

- `dj-scroll-end`
- `change`
- `dj-reorder`

## Methods

- `checkValidity(): boolean`
- `focus(options: FocusOptions)`
- `moveActive(delta: 1 | -1)`: Move the highlighted (active) option by one selectable step, wrapping; skips disabled items and dividers.
- `activateFirst()`: Highlight the first selectable option (skipping disabled items and dividers); clears the highlight if none.
- `chooseActive(): boolean`: Select the active option, firing the normal `change`. Returns false and fires nothing if none is active.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
