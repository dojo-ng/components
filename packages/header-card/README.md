# @dojo-ng/header-card

`<dj-header-card>` — A `<dj-card>` with a header row (avatar + title/subtitle).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A `<dj-card>` with a header row (avatar + title/subtitle). Slots: `avatar`, default (content), `actions`.

## Install

```bash
npm install @dojo-ng/header-card
```

## Usage

Import the package to register the custom element, then use the tag.

Slot header content above the body.

```html
<dj-header-card title="Profile">
  <span slot="header">Avatar and name</span>
  Body content.
</dj-header-card>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `kind` | kind | `"elevated" \| "outlined"` | `"elevated"` |

**Slots:** `avatar`, default (content), `actions`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
