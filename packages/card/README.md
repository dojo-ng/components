# @dojo-ng/card

`<dj-card>` — Content container.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Content container. Slots: `header`, default (content), `actions`. Optional `title`/`subtitle`/`media-src`. `clickable` makes the body a button. Parts: `root`, `media`, `body`, `actions`.

## Install

```bash
npm install @dojo-ng/card
```

## Usage

Import the package to register the custom element, then use the tag.

Title, body, and an actions slot.

```html
<dj-card title="Mont Blanc" subtitle="4,808 m">
  The highest mountain in the Alps.
  <div slot="actions">
    <dj-button kind="text">Details</dj-button>
  </div>
</dj-card>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `kind` | kind ↻ | `"elevated" \| "outlined"` | `"elevated"` |
| `square` | square | `boolean` | `false` |
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `mediaSrc` | media-src | `string` | — |
| `mediaTitle` | media-title | `string` | — |
| `clickable` | clickable | `boolean` | `false` |

**Slots:** `header`, default (content), `actions`

**Parts:** `root`, `media`, `body`, `actions`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
