# @dojo-ng/stack

`<dj-stack>` — Flex layout.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Flex layout. direction/align/spacing/padding/stretch.

## Install

```bash
npm install @dojo-ng/stack
```

## Usage

Import the package to register the custom element, then use the tag.

Evenly spaces its children.

```html
<dj-stack>
  <dj-button>One</dj-button>
  <dj-button>Two</dj-button>
</dj-stack>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `direction` | direction | `"vertical"\|"horizontal"` | `"vertical"` |
| `align` | align | `"start"\|"middle"\|"end"` | — |
| `spacing` | spacing | `"small"\|"medium"\|"large"` | `"medium"` |
| `padding` | padding | `"small"\|"medium"\|"large"` | — |
| `stretch` | stretch | `boolean` | `false` |

**Slots:** default

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
