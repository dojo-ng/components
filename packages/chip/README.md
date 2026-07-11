# @dojo-ng/chip

`<dj-chip>` — Compact label/tag.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Compact label/tag. Label in the default slot, optional icon in the `icon` slot. `clickable` wraps the body in a real `<button>` (native Enter/Space; the click bubbles from the host); `closeable` shows a separate close `<button>` that emits `dj-close`. The two are siblings, never nested, so a clickable + closeable chip stays valid ARIA. Parts: `root`, `action`, `close`.

## Install

```bash
npm install @dojo-ng/chip
```

## Usage

Import the package to register the custom element, then use the tag.

`closeable` adds a remove button; listen for `dj-close`.

```html
<dj-chip closeable>Design</dj-chip>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `disabled` | disabled ↻ | `boolean` | `false` |
| `checked` | checked ↻ | `boolean` | `false` |
| `clickable` | clickable | `boolean` | `false` |
| `closeable` | closeable | `boolean` | `false` |

**Slots:** `icon`, default

**Parts:** `root`, `action`, `close`

**Events:** `dj-close`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
