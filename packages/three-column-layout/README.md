# @dojo-ng/three-column-layout

`<dj-three-column-layout>` — Leading/center/trailing slots; collapses on narrow containers.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/three-column-layout
```

## Usage

Import the package to register the custom element, then use the tag.

Slot `leading`, `center`, and `trailing` content.

```html
<dj-three-column-layout>
  <nav slot="leading">Left</nav>
  <main slot="center">Center</main>
  <aside slot="trailing">Right</aside>
</dj-three-column-layout>
```

**Slots:** `leading`, `center`, `trailing`

**Parts:** `leading`, `center`, `trailing`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
