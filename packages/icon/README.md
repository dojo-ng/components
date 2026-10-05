# @dojo-ng/icon

`<dj-icon>` — A presentational icon.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Supply a glyph in one of two ways: set `type` to the name of an icon registered with `registerIcon` or `registerIcons`, or slot an inline `<svg>`.

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

## Accessibility

- Set `alt-text` when the icon carries meaning. It becomes the accessible name.
- Without `alt-text`, the icon is hidden from assistive technology (`aria-hidden`).

## SVG requirements

- A registered SVG must have a `viewBox`. dj-icon sizes a glyph by stretching it to fill the icon box, and an `<svg>` scales its artwork only when it has a `viewBox`.
- An SVG without a `viewBox` gets a box of the right size, but its artwork is clipped or not scaled. `registerIcon` and `registerIcons` log one console warning for each such icon, and they do not change the SVG.
- dj-icon's own sizing overrides any `width` or `height` attributes on a registered SVG.
- A slotted inline `<svg>` follows the same rules.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `string` | `""` |
| `size` | size ↻ | `IconSize` | — |
| `altText` | alt-text | `string` | — |

## Slots

- default slot

## CSS parts

- `base`

## CSS custom properties

- `--dj-icon-color`: Icon color. Default `currentColor`.

## Examples

### Registered icons and the viewBox rule

Register icons once, usually at startup, then refer to a glyph by `type`. Each registered SVG needs a `viewBox`.

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

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
