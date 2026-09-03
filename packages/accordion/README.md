# @dojo-ng/accordion

`<dj-accordion>` — Coordinates slotted `<dj-title-pane>` children.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Coordinates slotted `<dj-title-pane>` children. With `exclusive`, opening one pane closes the others. Listens for each pane's `dj-toggle`.

## Install

```bash
npm install @dojo-ng/accordion
```

## Usage

Import the package to register the custom element, then use the tag.

Compose title panes; set `exclusive` to allow only one open.

```html
<dj-accordion exclusive>
  <dj-title-pane title="One">First</dj-title-pane>
  <dj-title-pane title="Two">Second</dj-title-pane>
</dj-accordion>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `exclusive` | exclusive | `boolean` | `false` |

**Slots:** default

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
