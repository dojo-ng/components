# @dojo-ng/header

`<dj-header>` — App header bar.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

App header bar. `sticky` pins it. Slots: `leading`, default (title), `trailing`. @cssprop [--dj-header-z-index=700] - Stacking order of the header.

## Install

```bash
npm install @dojo-ng/header
```

## Usage

Import the package to register the custom element, then use the tag.

Slot `leading`/`trailing` content around the title; `sticky` pins it.

```html
<dj-header sticky>
  <button slot="leading">Menu</button>
  My App
  <button slot="trailing">Profile</button>
</dj-header>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `sticky` | sticky | `boolean` | `false` |

**Slots:** `leading`, default (title), `trailing`

**CSS properties:** `--dj-header-z-index` (default `700`; Stacking order of the header.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
