# @dojo-ng/floating-action-button

`<dj-floating-action-button>` — A circular (or extended/pill) action button, optionally fixed to a screen position.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Extends `DjButton` and inherits its properties and behavior.

A circular (or extended/pill) action button, optionally fixed to a screen position. Subclasses `<dj-button>`; default-slot label, `icon` slot.

## Install

```bash
npm install @dojo-ng/floating-action-button
```

## Usage

Import the package to register the custom element, then use the tag.

Pin it to a screen corner with `position`.

```html
<dj-floating-action-button position="bottom-right" aria-label="Add">
  <svg slot="icon" viewBox="0 0 24 24" width="22" height="22"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg>
</dj-floating-action-button>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `size` | size ↻ | `FabSize` | `"normal"` |
| `position` | position ↻ | `FabPosition` | — |

**CSS properties:** `--dj-fab-z-index` (default `800`; Stacking order of the floating action button.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
