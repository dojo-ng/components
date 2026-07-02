# @dojo-ng/text

`<dj-text>` — Typographic wrapper.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Typographic wrapper. size/weight/uppercase/truncated/inverse. Part: `base`.

## Install

```bash
npm install @dojo-ng/text
```

## Usage

Import the package to register the custom element, then use the tag.

A small typography primitive.

```html
<dj-text>Body copy.</dj-text>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `size` | size | `"x-small"\|"small"\|"medium"\|"large"\|"x-large"\|"xx-large"` | `"medium"` |
| `weight` | weight | `"light"\|"normal"\|"heavy"` | `"normal"` |
| `inverse` | inverse | `boolean` | `false` |
| `truncated` | truncated | `boolean` | `false` |
| `uppercase` | uppercase | `boolean` | `false` |

**Slots:** default

**Parts:** `base`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
