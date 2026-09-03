# @dojo-ng/snackbar

`<dj-snackbar>` — A toast.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A toast. `open` shows it; `type` success/error tints; slots: default (message), `actions`. @cssprop [--dj-snackbar-z-index=960] - Stacking order of the snackbar.

## Install

```bash
npm install @dojo-ng/snackbar
```

## Usage

Import the package to register the custom element, then use the tag.

Toggle `open`; `type` tints success/error.

```html
<dj-snackbar open type="success">Saved</dj-snackbar>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `type` | type | `"success"\|"error"` | — |
| `leading` | leading | `boolean` | `false` |
| `stacked` | stacked | `boolean` | `false` |

**Slots:** default, `actions`

**CSS properties:** `--dj-snackbar-z-index` (default `960`; Stacking order of the snackbar.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
