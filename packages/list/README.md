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

- The arrow keys, Home, and End move the active item.
- Enter or Space selects it.

## Options

- `menu` switches the roles to `menu` and `menuitem`.
- `loading` shows a spinner.

## Reordering

- With `reorderable`, items can be dragged with a pointer or touch, or moved with the keyboard: Space to grab, the arrow keys to move, Space to drop, and Escape to cancel.
- Reordering is controlled: the list emits `dj-reorder`, and you reorder `options`.

## Not built

- Virtualization for very long lists.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `menu` | menu | `boolean` | `false` |
| `loading` | loading | `boolean` | `false` |
| `reorderable` | reorderable ↻ | `boolean` | `false` |

## CSS parts

- `list`
- `item`
- `drop-indicator`

## Events

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
