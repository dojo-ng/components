# @dojo-ng/badge

`<dj-badge>` — A small count or status label that decorates other content.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Presentational: it carries no ARIA role. When a badge shows a count for a control (e.g. an unread count on a button), put the accessible name on the CONTROL — `aria-label="Notifications, 4 unread"` — not on the badge, so assistive tech reads the meaning rather than a bare number.

Content is the default slot.

Presentational only — a badge has no ARIA role. When it shows a count for a control (an unread count on a button, say), put the accessible name on the CONTROL (`aria-label="Notifications, 4 unread"`), not on the badge, so assistive tech reads the meaning rather than a bare number. Variant colors reuse the theme's semantic `--dj-color-*-600` scales; override a single badge with `--dj-badge-background` / `--dj-badge-color`.

## Install

```bash
npm install @dojo-ng/badge
```

## Usage

Import the package to register the custom element, then use the tag.

`variant` picks a semantic color; `pill` fully rounds it.

```html
<dj-badge>Neutral</dj-badge>
<dj-badge variant="info">Info</dj-badge>
<dj-badge variant="success">Success</dj-badge>
<dj-badge variant="warning">Warning</dj-badge>
<dj-badge variant="danger" pill>3</dj-badge>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `variant` | variant ↻ | `BadgeVariant` | `"neutral"` |
| `pill` | pill ↻ | `boolean` | `false` |

## Slots

- default slot

## CSS parts

- `base`: The badge box.

## CSS custom properties

- `--dj-badge-background`: Background fill; defaults to the variant's `--dj-color-*-600` scale. Default `per-variant semantic color`.
- `--dj-badge-color`: Text color. Default `var(--dj-color-neutral-0)`.
- `--dj-badge-radius`: Corner radius (ignored when `pill` is set). Default `var(--dj-input-border-radius-small)`.
- `--dj-badge-font-size`: Badge text size. Default `0.75rem`.

## Examples

### Count on a control

Put the accessible name on the control, not the badge.

```html
<dj-button aria-label="Notifications, 4 unread">
  Inbox <dj-badge variant="danger" pill>4</dj-badge>
</dj-button>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
