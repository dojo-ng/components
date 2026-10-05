# @dojo-ng/alert

`<dj-alert>` — An inline status banner.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

It sits in the page flow, next to the content it concerns. For a short message that floats and goes away, use `dj-snackbar`. For a full-page outcome, use `dj-result`.

## Install

```bash
npm install @dojo-ng/alert
```

## Usage

Import the package to register the custom element, then use the tag.

Each variant has a default glyph and live-region role.

```html
<dj-alert variant="info">Heads up — a new version is available.</dj-alert>
<dj-alert variant="success">Your changes were saved.</dj-alert>
<dj-alert variant="warning">Your trial ends in 3 days.</dj-alert>
<dj-alert variant="danger">Payment failed. Update your card.</dj-alert>
```

## Showing and closing

- An alert in markup shows by default (`open` is true).
- `close()` hides it and emits `dj-close`. A closed alert takes no space.
- Add `closable` for a close button. Its label is the localized `close` message.

## Variants

- `info` and `success` announce politely (`role="status"`).
- `warning` and `danger` announce immediately (`role="alert"`).
- Each variant has a default icon. Replace it with the `icon` slot.
- Colors come from the theme's semantic scales. To change one alert, set `--dj-alert-background`, `--dj-alert-color`, and `--dj-alert-accent-color` on it.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `variant` | variant ↻ | `AlertVariant` | `"info"` |
| `closable` | closable | `boolean` | `false` |
| `open` | open ↻ | `boolean` | `true` |

## Slots

- default slot: The message.
- `icon`: Replaces the default variant glyph.

## CSS parts

- `base`
- `icon`
- `message`
- `close`

## Events

- `dj-close`: After the alert closes.

## Methods

- `close()`: Close the alert: hides it and emits `dj-close` once. No-op if already closed.

## CSS custom properties

- `--dj-alert-background`: Banner background; defaults to the variant's `--dj-color-*-100`. Default `per-variant tint`.
- `--dj-alert-color`: Text color; defaults to the variant's `--dj-color-*-700`. Default `per-variant ink`.
- `--dj-alert-accent-color`: Icon + leading-border color; defaults to the variant's `--dj-color-*-600`. Default `per-variant accent`.
- `--dj-alert-radius`: Corner radius. Default `var(--dj-input-border-radius-medium)`.

## Examples

### Closable, with a custom icon

`closable` adds a dismiss button; the `icon` slot replaces the glyph. Listen for `dj-close`.

```html
<dj-alert variant="success" closable>
  <svg slot="icon" viewBox="0 0 24 24" width="20" height="20"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
  Deploy finished.
</dj-alert>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
