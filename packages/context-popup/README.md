# @dojo-ng/context-popup

`<dj-context-popup>` — Right-click (contextmenu) on the trigger (default slot) opens a `<dj-popup>` at the cursor, holding the `content` slot.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/context-popup
```

## Usage

Import the package to register the custom element, then use the tag.

The default slot is the trigger; `content` is shown on right-click.

```html
<dj-context-popup>
  <div>Right-click this area</div>
  <div slot="content">Context actions</div>
</dj-context-popup>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |

**Slots:** default, `content`

**Events:** `dj-open`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
