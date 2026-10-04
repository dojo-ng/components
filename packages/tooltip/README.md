# @dojo-ng/tooltip

`<dj-tooltip>` — Shows tip content next to its trigger on hover/focus.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The trigger goes in the default slot, the tip in the `content` slot. Set `open` to force it shown.

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
