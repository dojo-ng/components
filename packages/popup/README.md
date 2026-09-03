# @dojo-ng/popup

`<dj-popup>` — Positions slotted content as an overlay, flipping to the opposite side when there isn't room in the preferred position.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Positions slotted content as an overlay, flipping to the opposite side when there isn't room in the preferred position. Anchor it by setting the `anchor` property to an element, or supply viewport coordinates via the `x-*`/`y-*` attributes. While open it locks body scroll and closes on Escape or underlay click, emitting a `dj-close` event. Content goes in the default slot.

## Install

```bash
npm install @dojo-ng/popup
```

## Usage

Import the package to register the custom element, then use the tag.

A low-level primitive; most apps use it through `trigger-popup`, `select`, and similar. Set `anchor` in JS and toggle `open`.

```html
<dj-button id="anchor">Anchor</dj-button>
<dj-popup id="pop" position="below">Floating content</dj-popup>
<script type="module">
  import "@dojo-ng/popup"; import "@dojo-ng/button";
  const pop = document.getElementById("pop");
  pop.anchor = document.getElementById("anchor");
  document.getElementById("anchor").addEventListener("click", () => (pop.open = !pop.open));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `underlayVisible` | underlay-visible ↻ | `boolean` | `false` |
| `scrollLock` | scroll-lock | `boolean` | `true` |
| `yTop` | y-top | `number` | `0` |
| `yBottom` | y-bottom | `number` | `0` |
| `xLeft` | x-left | `number` | `0` |
| `xRight` | x-right | `number` | `0` |

**Slots:** default

**Parts:** `underlay`, `wrapper`, `layer`

**Events:** `dj-close`

**Methods:** `close()` (Close the popup and emit `dj-close`.)

**CSS properties:** `--dj-popup-z-index` (default `901`; Stacking order of the popup.), `--dj-popup-underlay-z-index` (default `900`; Stacking order of the popup underlay.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
