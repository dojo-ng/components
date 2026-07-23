# @dojo-ng/icon

`<dj-icon>` — A presentational icon.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A presentational icon. Supply a glyph either by `type` (a name registered via `registerIcon`, resolved from the SVG icon registry) or by slotting an inline `<svg>`. `alt-text` makes the icon meaningful to assistive tech; without it the icon is aria-hidden.

> A registered SVG must carry a `viewBox`. dj-icon sizes a glyph by stretching it to fill the icon box, and an `<svg>` only scales its artwork when it has a `viewBox`; one without gets a correctly-sized box with clipped or unscaled artwork. `registerIcon`/`registerIcons` log a one-time console warning for any icon registered without a `viewBox`, and never rewrite it. Any `width` or `height` attributes on a registered SVG are overridden by dj-icon's own sizing. A slotted inline `<svg>` follows the same rule.

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

## Examples

### Registered icons and the viewBox rule

Register once (usually at startup), then reference a glyph by `type`. A registered SVG must include a `viewBox` so it scales to the icon size; one without is sized but its artwork is clipped, and the registry logs a one-time warning.

```html
<dj-icon type="star" size="large" alt-text="Favorite"></dj-icon>
<script type="module">
  import "@dojo-ng/icon";
  import { registerIcon } from "@dojo-ng/icon";
  // Good: has a viewBox, so the glyph scales to any size.
  registerIcon("star", '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>');
  // Bad: no viewBox, so the box is sized but the artwork is clipped, and this logs a console warning.
  registerIcon("star-bad", '<svg width="24" height="24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>');
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
