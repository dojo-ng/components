# @dojo-ng/result

`<dj-result>` — A status/result block with an icon, title, subtitle, content, and actions.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A status/result block with an icon, title, subtitle, content, and actions. `status` (success|error|alert|info) sets a default icon + color; override via the `icon` slot. Slots: `icon`, default (content), `actions`. Parts: `root`, `status`.

## Install

```bash
npm install @dojo-ng/result
```

## Usage

Import the package to register the custom element, then use the tag.

Compose a heading, message, and actions.

```html
<dj-result>
  <span slot="title">No results</span>
  Try a different search.
</dj-result>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `status` | status ↻ | `"alert" \| "error" \| "info" \| "success"` | — |

**Slots:** `icon`, default (content), `actions`

**Parts:** `root`, `status`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
