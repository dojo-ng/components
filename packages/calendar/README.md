# @dojo-ng/calendar

`<dj-calendar>` — A form-associated month-grid date picker.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated month-grid date picker. `value` is an ISO date (yyyy-mm-dd). Localizes month and weekday names via Intl (set `locale`). Keyboard: arrows move by day/week, PageUp/PageDown change month, Enter/Space select. `min`/`max` (ISO) bound selection. Composes `<dj-icon>` for navigation. Functional core; year-picker popup and range selection are deferred. Parts: `header`, `grid`, `day`.

## Install

```bash
npm install @dojo-ng/calendar
```

## Usage

Import the package to register the custom element, then use the tag.

Set `locale` to localize month and weekday names; listen for `change`.

```html
<dj-calendar value="2026-06-15" locale="en-US"></dj-calendar>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `min` | min | `string` | — |
| `max` | max | `string` | — |
| `locale` | locale | `string` | — |
| `firstDayOfWeek` | first-day-of-week | `number` | `0` |

**Parts:** `header`, `grid`, `day`

**Events:** `change`

**Methods:** `checkValidity(): boolean`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
