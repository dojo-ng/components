# @dojo-ng/list

`<dj-list>` — A single-select list/menu driven by `options`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A single-select list/menu driven by `options`. Uses the active-descendant pattern (one tab stop; arrow/Home/End move the active item, Enter/Space selects). `menu` switches roles to menu/menuitem. Form-associated (submits `value`). Shows a spinner when `loading`. With `reorderable`, items can be dragged (pointer/touch) or moved by keyboard (space to grab, arrows to move, space to drop, escape to cancel) — controlled: it emits `dj-reorder` and the consumer reorders `options`. Virtualization is deferred. Parts: `list`, `item`. @cssprop [--dj-list-max-height=none] - Maximum height before the list scrolls.

> Coming from Dojo's **Listbox**? Use this component: it provides the selectable listbox role and keyboard model that Listbox did. Set `reorderable` to let items be reordered by drag or keyboard (space to grab, arrows to move, space to drop, escape to cancel); it is controlled — the list emits `dj-reorder` and you reorder `options`.

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

**Parts:** `list`, `item`, `drop-indicator`

**Events:** `change`, `dj-reorder`

**Methods:** `checkValidity(): boolean`, `focus(options: FocusOptions)`, `moveActive(delta: 1 | -1)` (Move the highlighted (active) option by one selectable step, wrapping; skips disabled items and dividers.), `activateFirst()` (Highlight the first selectable option (skipping disabled items and dividers); clears the highlight if none.), `chooseActive(): boolean` (Select the active option, firing the normal `change`. Returns false and fires nothing if none is active.)

**CSS properties:** `--dj-list-max-height` (default `none`; Maximum height before the list scrolls.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
