# @dojo-ng/toolbar

`<dj-toolbar>` — A horizontal action bar with `role="toolbar"`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/toolbar
```

## Usage

Import the package to register the custom element, then use the tag.

Slot `leading`, a title (default), and `actions`; secondary actions collapse into an overflow menu via the `overflow` property.

```html
<dj-toolbar label="Records" id="tb">
  <dj-button slot="leading" kind="text">Back</dj-button>
  Records
  <dj-button slot="actions">New</dj-button>
</dj-toolbar>
<script type="module">
  import "@dojo-ng/toolbar"; import "@dojo-ng/button";
  const tb = document.getElementById("tb");
  tb.overflow = [{ value: "export", label: "Export" }, { value: "delete", label: "Delete" }];
  tb.addEventListener("dj-action", (e) => console.log(e.detail.value));
</script>
```

## Layout

- The `leading` slot holds a logo or a menu or back button.
- The default slot holds the title or other content.
- The `actions` slot holds the primary action buttons, aligned to the end.
- `sticky` pins the bar to the top.

## Overflow menu

- Set the `overflow` property to a list of options to put secondary actions in a menu. A `⋮` button opens them in a popup `<dj-list>`.
- Choosing one emits `dj-action` with its value.
- The menu closes when an item is chosen, on Escape, on a click outside, and when focus leaves it.

## Not built

- Moving slotted actions into the menu automatically when space runs out. For now your app decides which actions are primary and which go in `overflow`.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `label` | label | `string` | — |
| `sticky` | sticky ↻ | `boolean` | `false` |
| `overflow` | — | `ListOption[]` | `[]` |
| `overflowPosition` | overflow-position ↻ | `PopupPosition` | `"below"` |

## Slots

- `leading`: A logo, or a menu or back button.
- default slot: The title or other content.
- `actions`: The primary action buttons, aligned to the end.

## CSS parts

- `bar`
- `leading`
- `title`
- `actions`
- `overflow`

## Events

- `dj-action`: Detail: `{ value }`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
