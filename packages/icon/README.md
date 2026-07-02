# @dojo-ng/icon

`<dj-icon>` — A presentational icon.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A presentational icon. Supply a glyph either by `type` (a name registered via `registerIcon`, resolved from the SVG icon registry) or by slotting an inline `<svg>`. `alt-text` makes the icon meaningful to assistive tech; without it the icon is aria-hidden.

## Install

```bash
npm install @dojo-ng/icon
```

## Usage

Import the package to register the custom element, then use the tag.

Slot an SVG; it inherits `currentColor` and sizing.

```html
<dj-icon>
  <svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" fill="currentColor"/></svg>
</dj-icon>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `string` | `""` |
| `size` | size ↻ | `IconSize` | — |
| `altText` | alt-text | `string` | — |

**Slots:** default

**Parts:** `base`

**CSS properties:** `--dj-icon-color` (default `currentColor`; Icon color.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
