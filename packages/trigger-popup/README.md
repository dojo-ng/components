# @dojo-ng/trigger-popup

`<dj-trigger-popup>` — Clicking the trigger (default slot) opens a `<dj-popup>` anchored to it, holding the `content` slot.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Clicking the trigger (default slot) opens a `<dj-popup>` anchored to it, holding the `content` slot. `match-width` sizes the popup to the trigger.

## Install

```bash
npm install @dojo-ng/trigger-popup
```

## Usage

Import the package to register the custom element, then use the tag.

The `trigger` slot toggles the default-slot content.

```html
<dj-trigger-popup>
  <dj-button slot="trigger">Menu</dj-button>
  <div>Popup content</div>
</dj-trigger-popup>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `matchWidth` | match-width | `boolean` | `true` |
| `underlayVisible` | underlay-visible | `boolean` | `false` |

**Slots:** default, `content`

**Events:** `dj-open`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
