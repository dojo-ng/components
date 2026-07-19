# @dojo-ng/alert

`<dj-alert>` — An inline status banner.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

An inline status banner. It sits in the page flow (unlike the transient, floating `dj-snackbar`, and unlike the full-page `dj-result`); use it to call out a persistent state next to the content it concerns. An alert written in markup shows by default (`open`); closing it sets `open` false and it takes no space. Info/success announce politely (`role="status"`); warning/danger announce assertively (`role="alert"`).

> An inline status banner that sits in the page flow — distinct from `dj-snackbar` (transient, floating) and `dj-result` (full-page). It shows by default (`open`); `close()` hides it and emits `dj-close`. info/success announce politely (`role="status"`), warning/danger assertively (`role="alert"`). Each variant has a default glyph; override it via the `icon` slot. Add `closable` for a dismiss button (its label is the localized `close` key). Variant colors reuse the theme's semantic tint/ink scales; override one alert with `--dj-alert-background` / `--dj-alert-color` / `--dj-alert-accent-color`.

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

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `variant` | variant ↻ | `AlertVariant` | `"info"` |
| `closable` | closable | `boolean` | `false` |
| `open` | open ↻ | `boolean` | `true` |

**Slots:** default (the message), `icon` (replaces the default variant glyph)

**Parts:** `base`, `icon`, `message`, `close`

**Events:** `dj-close` (after the alert closes)

**Methods:** `close()` (Close the alert: hides it and emits `dj-close` once. No-op if already closed.)

**CSS properties:** `--dj-alert-background` (default `per-variant tint`; Banner background; defaults to the variant's `--dj-color-*-100`.), `--dj-alert-color` (default `per-variant ink`; Text color; defaults to the variant's `--dj-color-*-700`.), `--dj-alert-accent-color` (default `per-variant accent`; Icon + leading-border color; defaults to the variant's `--dj-color-*-600`.), `--dj-alert-radius` (default `var(--dj-input-border-radius-medium)`; Corner radius.)

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

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
