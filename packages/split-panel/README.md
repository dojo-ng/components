# @dojo-ng/split-panel

`<dj-split-panel>` — Two resizable panes with a draggable divider between them.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Put the panes in the `start` and `end` slots. `position` is the start pane's share of the space, as a percent from 0 to 100. The host needs a size, because the panes fill it: for a horizontal split, give it a height.

## Install

```bash
npm install @dojo-ng/split-panel
```

## Usage

Import the package to register the custom element, then use the tag.

A sidebar and content with minimum widths. `dj-reposition` reports the new position.

```html
<dj-split-panel position="40"
  style="height: 300px; --dj-split-panel-min-start: 120px; --dj-split-panel-min-end: 160px">
  <div slot="start">Sidebar</div>
  <div slot="end">Content</div>
</dj-split-panel>
<script type="module">
  import "@dojo-ng/split-panel";
  const sp = document.querySelector("dj-split-panel");
  sp.addEventListener("dj-reposition", (e) => console.log("position", e.detail.position));
</script>
```

## Layout

- `orientation="horizontal"` (the default) puts the panes side by side with a vertical divider. `vertical` stacks them with a horizontal divider.
- The panes always divide in the ratio `position` : (100 − `position`).
- Minimum pane sizes come from CSS, not from properties: set `--dj-split-panel-min-start` and `--dj-split-panel-min-end` in any length unit, and dragging stops at that size.
- The order follows the writing direction, so in a right-to-left page the start pane is on the right with no extra work.
- The divider bar is drawn by the component. Put custom grip content in the optional `divider` slot.
- For three panes, nest a second `dj-split-panel` inside a slot of the first.

## Resizing

- Drag the divider with a mouse, a trackpad, or touch.
- Or focus the divider and use the keyboard, so resizing never requires dragging (WCAG 2.5.7): the arrow keys move it by 1 (Shift: by 10), Home moves it to 0, and End to 100. A horizontal split uses Left and Right in the reading direction; a vertical split uses Up and Down.
- `dj-reposition` fires when the split settles: once when a drag ends, and once per key press.

## Accessibility

- The divider has `role="separator"`, with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` tracking `position`.
- Its `aria-orientation` is the divider's own direction, so a horizontal split has a vertical separator.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `orientation` | orientation ↻ | `"horizontal" \| "vertical"` | `"horizontal"` |
| `position` | position ↻ | `number` | `50` |
| `disabled` | disabled ↻ | `boolean` | `false` |

## Slots

- `start`
- `divider`
- `end`

## CSS parts

- `start`
- `end`
- `divider`

## Events

- `dj-reposition`: Detail `{ position }`.

## CSS custom properties

- `--dj-split-panel-min-start`: Minimum size of the start pane (any length). Default `0`.
- `--dj-split-panel-min-end`: Minimum size of the end pane (any length). Default `0`.
- `--dj-split-panel-divider-width`: Thickness of the divider bar. Default `4px`.
- `--dj-split-panel-divider-color`: Divider bar color. Default `var(--dj-color-border)`.

## Examples

### Three panes (nested)

Nest a splitter in a slot for a third pane. Here the end pane is itself a vertical split.

```html
<dj-split-panel style="height: 400px" position="30">
  <nav slot="start">Files</nav>
  <dj-split-panel slot="end" orientation="vertical" position="70">
    <main slot="start">Editor</main>
    <div slot="end">Terminal</div>
  </dj-split-panel>
</dj-split-panel>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
