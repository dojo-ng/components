# @dojo-ng/title-pane

`<dj-title-pane>` — A collapsible panel with a title bar.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A collapsible panel with a title bar. Content goes in the default slot. Click the title (when `closeable`) to toggle; emits `dj-toggle` with `{ open }`.

## Install

```bash
npm install @dojo-ng/title-pane
```

## Usage

Import the package to register the custom element, then use the tag.

Toggle `open`; the title is the trigger.

```html
<dj-title-pane title="Advanced options" open>
  Hidden settings live here.
</dj-title-pane>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `name` | name | `string` | `""` |
| `open` | open ↻ | `boolean` | `false` |
| `closeable` | closeable | `boolean` | `true` |
| `headingLevel` | heading-level | `number` | — |

**Slots:** default

**Parts:** `title`, `button`, `content`

**Events:** `dj-toggle`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
