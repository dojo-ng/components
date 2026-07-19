# @dojo-ng/dropdown

`<dj-dropdown>` — The APG menu-button glue over the existing `<dj-popup>` and `<dj-list>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The APG menu-button glue over the existing `<dj-popup>` and `<dj-list>`. Put the trigger (usually a `<dj-button>`) in the `trigger` slot and the content — typically one `<dj-list>` — in the default slot; the content renders in a `<dj-popup>` anchored to the trigger. Behavior: clicking the trigger toggles it. ArrowDown / Enter / Space open it; on open, if the content is a `<dj-list>`, its `menu` mode is switched on, it is focused, and its first item is activated. Escape closes and returns focus to the trigger; choosing an item (the list's `change` event) closes and refocuses too — the `change` event still reaches the consumer untouched. Non-list content is allowed as an arbitrary panel: then dj-dropdown only does open/close/Escape/focus-return, with no list steering.

> The APG menu-button glue over `dj-popup` + `dj-list`: the trigger goes in the `trigger` slot, the menu (usually one `dj-list`) in the default slot. Click or ArrowDown/Enter/Space opens it and moves into the list; Enter chooses and closes; Escape closes; focus returns to the trigger each time. It sets `aria-haspopup`/`aria-expanded` on your trigger for you. Non-list content is allowed as a plain anchored panel (then it only does open/close/Escape/focus-return) — for a generic anchored panel with no menu semantics use `dj-trigger-popup`, and for right-click use `dj-context-menu`.

## Install

```bash
npm install @dojo-ng/dropdown
```

## Usage

Import the package to register the custom element, then use the tag.

A button trigger plus a dj-list menu. Enter/Arrow keys drive it; choosing an item closes it.

```html
<dj-dropdown>
  <dj-button slot="trigger">Actions</dj-button>
  <dj-list id="menu"></dj-list>
</dj-dropdown>
<script type="module">
  import "@dojo-ng/dropdown";
  import "@dojo-ng/button";
  import "@dojo-ng/list";
  document.getElementById("menu").options = [
    { value: "rename", label: "Rename" },
    { value: "duplicate", label: "Duplicate" },
    { value: "delete", label: "Delete" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `matchWidth` | match-width | `boolean` | `false` |

**Slots:** `trigger` (the button), default (the menu list or panel)

**Parts:** `panel` (the content wrapper inside the popup)

**Events:** `dj-open`, `dj-close`

## Examples

### Free panel

Non-list content is a plain anchored panel — open/close/Escape only.

```html
<dj-dropdown>
  <dj-button slot="trigger">Filters</dj-button>
  <div style="padding:12px">Any panel content here.</div>
</dj-dropdown>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
