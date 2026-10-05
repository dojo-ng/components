# @dojo-ng/dropdown

`<dj-dropdown>` — A menu button: a trigger that opens a menu or panel anchored to it, built on `<dj-popup>` and `<dj-list>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Put the trigger, usually a `<dj-button>`, in the `trigger` slot, and the menu, usually one `<dj-list>`, in the default slot.

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

## Opening and closing

- A click on the trigger opens or closes it. ArrowDown, Enter, and Space open it.
- When the content is a `<dj-list>`, opening switches on its `menu` mode, focuses it, and activates the first item.
- Choosing an item closes the menu. The list's `change` event still reaches your code unchanged.
- Escape closes it. Focus returns to the trigger every time it closes.

## Other content

- Content that is not a `<dj-list>` works as a plain anchored panel. The dropdown then only opens, closes, handles Escape, and returns focus.
- For an anchored panel with no menu behavior, use `dj-trigger-popup`. For a right-click menu, use `dj-context-menu`.

## Accessibility

- It follows the APG menu button pattern, and sets `aria-haspopup` and `aria-expanded` on your trigger for you.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `matchWidth` | match-width | `boolean` | `false` |

## Slots

- `trigger`: The button.
- default slot: The menu list or panel.

## CSS parts

- `panel`: The content wrapper inside the popup.

## Events

- `dj-open`
- `dj-close`

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

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
