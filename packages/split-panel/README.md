# @dojo-ng/split-panel

`<dj-split-panel>` — Two resizable panes with a draggable divider between them.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Two resizable panes with a draggable divider between them. The `start` and `end` slots hold the panes; the divider is a shadow-side bar (put custom grip content in the optional `divider` slot). `position` is the start pane's share as a percent (0–100); the layout is a CSS grid whose start/end tracks are `position`fr and `(100 − position)`fr, so the panes always divide in that ratio. Minimum pane sizes come from CSS, not props: the tracks are `minmax(var(--dj-split-panel-min-start), …)` / `minmax(var(--dj-split-panel-min-end), …)`, so a consumer sets a floor in any length unit and the browser clamps the drag against it. The host needs a size (for `horizontal`, a height) since the panes fill it. `orientation="horizontal"` (default) puts the panes side by side with a vertical divider; `vertical` stacks them with a horizontal divider. Column order follows the host's writing direction, so in RTL the start pane sits on the right with no extra work. The divider is a `role="separator"` with `aria-valuenow/valuemin/valuemax` tracking `position` and `aria-orientation` set to the divider's own visual axis (vertical for a horizontal split). Dragging uses pointer events with pointer capture, so mouse, trackpad, and touch all work; the divider position is read from the pointer's offset within the host rect (RTL-mirrored for a horizontal split — a pointer at the visual left is 100%). Because dragging is a pointer gesture, WCAG 2.5.7 needs a non-drag path: the focused divider takes Arrow keys (±1, Shift = ±10) mapped through reading direction for horizontal and Up/Down for vertical, plus Home (0) and End (100). `dj-reposition` fires on settle: once on pointer-up for a drag, and once per keypress.

> The host needs a size the panes can fill: for a horizontal split give it a height (width comes from the flow). Minimum pane sizes are CSS, not props — set `--dj-split-panel-min-start` and `--dj-split-panel-min-end` to any length and the browser clamps the drag against them. Dragging is a pointer gesture, so the divider also takes the keyboard for WCAG 2.5.7: focus it and use the arrow keys (Shift for a larger step), Home, and End. For a three-pane layout, nest one `dj-split-panel` inside a slot of another.

## Install

```bash
npm install @dojo-ng/split-panel
```

## Usage

Import the package to register the custom element, then use the tag.

Slot `start` and `end` panes; drag the divider or focus it and use the arrow keys. `position` is the start pane's percent share. `dj-reposition` fires with the settled `{ position }`. Min pane sizes come from the `--dj-split-panel-min-*` tokens, not props.

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

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `orientation` | orientation ↻ | `"horizontal" \| "vertical"` | `"horizontal"` |
| `position` | position ↻ | `number` | `50` |
| `disabled` | disabled ↻ | `boolean` | `false` |

**Slots:** `start`, `divider`, `end`

**Parts:** `start`, `end`, `divider`

**Events:** `dj-reposition` (detail `{ position }`)

**CSS properties:** `--dj-split-panel-min-start` (default `0`; Minimum size of the start pane (any length).), `--dj-split-panel-min-end` (default `0`; Minimum size of the end pane (any length).), `--dj-split-panel-divider-width` (default `4px`; Thickness of the divider bar.), `--dj-split-panel-divider-color` (default `var(--dj-color-border)`; Divider bar color.)

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

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
