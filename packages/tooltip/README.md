# @dojo-ng/tooltip

`<dj-tooltip>` — Shows tip content next to its trigger on hover/focus.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The trigger goes in the default slot, the tip in the `content` slot. Set `open` to force it shown. Escape hides a tip that hover or focus showed, without moving the pointer or focus; entering or focusing the trigger again shows it again. When a tooltip is open over a dialog, Escape hides the tip first and leaves the dialog open.

The tip describes its trigger: the slotted trigger element gets `aria-describedby` pointing at the slotted tip (an `id` is generated for the tip when it has none). Put the tooltip around an element that carries the role, such as a native `<button>`; a custom element whose focusable part sits in its own shadow root cannot receive the reference.

The tip renders in the browser top layer where the Popover API exists, so an `overflow: hidden` or transformed ancestor cannot clip it. It sits on the `orientation` side and flips to the opposite side when there is no room there, then stays inside the viewport.

## Install

```bash
npm install @dojo-ng/tooltip
```

## Usage

Import the package to register the custom element, then use the tag.

Wrap a trigger; content shows on hover/focus.

```html
<dj-tooltip>
  <dj-button>Hover me</dj-button>
  <span slot="content">Saves your work</span>
</dj-tooltip>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `orientation` | orientation ↻ | `TooltipOrientation` | `"top"` |

## Slots

- default slot
- `content`

## CSS parts

- `content`

## CSS custom properties

- `--dj-tooltip-z-index`: Stacking order of the tooltip. Default `950`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
