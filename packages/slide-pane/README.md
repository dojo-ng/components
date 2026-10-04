# @dojo-ng/slide-pane

`<dj-slide-pane>` — A panel that slides in from an edge.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Slots: `title`, default (content). Closes on Escape, the close button, and underlay click. Locks body scroll while open. Emits `dj-close`. Width/height comes from `width` (px). Parts: `underlay`, `pane`, `title`, `close`, `content`.

## Install

```bash
npm install @dojo-ng/slide-pane
```

## Usage

Import the package to register the custom element, then use the tag.

Slides in from `align`; toggle `open`.

```html
<dj-button id="open-pane">Open pane</dj-button>
<dj-slide-pane id="pane" align="right">
  <span slot="title">Filters</span>
  Panel content here.
</dj-slide-pane>
<script type="module">
  import "@dojo-ng/slide-pane"; import "@dojo-ng/button";
  document.getElementById("open-pane").addEventListener("click", () => (document.getElementById("pane").open = true));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `align` | align ↻ | `SlidePaneAlign` | `"left"` |
| `width` | width | `number` | `320` |
| `underlay` | underlay | `boolean` | `true` |
| `closeText` | close-text | `string` | — |

## Slots

- `title`
- default slot: Content.

## CSS parts

- `underlay`
- `pane`
- `title`
- `close`
- `content`

## Events

- `dj-close`

## Methods

- `close()`

## CSS custom properties

- `--dj-slide-pane-size`: Width (left/right) or height (top/bottom) of the pane. Default `320px`.
- `--dj-slide-pane-z-index`: Stacking order of the pane. Default `931`.
- `--dj-slide-pane-underlay-z-index`: Stacking order of the pane underlay (scrim). Default `930`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
