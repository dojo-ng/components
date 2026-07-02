# @dojo-ng/helper-text

`<dj-helper-text>` — Supporting text shown under a form control.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Supporting text shown under a form control. Provide text via the `text` attribute, or slot richer content. `valid` (tri-state) tints the text.

## Install

```bash
npm install @dojo-ng/helper-text
```

## Usage

Import the package to register the custom element, then use the tag.

`valid` (tri-state) tints the text for validation feedback.

```html
<dj-helper-text text="Must be at least 8 characters"></dj-helper-text>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `text` | text | `string` | — |
| `valid` | valid | `boolean` | — |

**Slots:** default

**Parts:** `base`, `text`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
