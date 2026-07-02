# @dojo-ng/two-column-layout

`<dj-two-column-layout>` — Leading + trailing slots; collapses to one column on narrow containers (container query).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/two-column-layout
```

## Usage

Import the package to register the custom element, then use the tag.

Slot `leading` and `trailing` content.

```html
<dj-two-column-layout>
  <nav slot="leading">Sidebar</nav>
  <main>Content</main>
</dj-two-column-layout>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `bias` | bias | `"leading"\|"trailing"` | — |

**Slots:** `leading`, `trailing`

**Parts:** `leading`, `trailing`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
