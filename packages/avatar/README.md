# @dojo-ng/avatar

`<dj-avatar>` — Circular/rounded/square avatar from an image `src` or slotted initials/icon.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Circular/rounded/square avatar from an image `src` or slotted initials/icon. Part: `base`.

## Install

```bash
npm install @dojo-ng/avatar
```

## Usage

Import the package to register the custom element, then use the tag.

Show an image, or fall back to initials.

```html
<dj-avatar src="https://example.com/a.jpg" name="Ada Lovelace"></dj-avatar>
<dj-avatar>AL</dj-avatar>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type ↻ | `"circle" \| "square" \| "rounded"` | `"circle"` |
| `size` | size ↻ | `"small" \| "medium" \| "large"` | `"medium"` |
| `src` | src | `string` | — |
| `alt` | alt | `string` | — |
| `secondary` | secondary ↻ | `boolean` | `false` |
| `outline` | outline ↻ | `boolean` | `false` |

**Slots:** default

**Parts:** `base`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
