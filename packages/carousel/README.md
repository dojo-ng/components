# @dojo-ng/carousel

`<dj-carousel>` — A slotted, swipeable carousel.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A slotted, swipeable carousel. Each top-level element in the default slot is one item (cards, images, tiles — arbitrary content). The item strip is a native horizontal scroll container with CSS scroll-snap, so touch and trackpad swiping is real scrolling: there is no pointer/drag code and no WCAG 2.5.7 (dragging) concern — the prev/next buttons are the non-drag path. `per-view` sizes items to show N at once (gap-adjusted); `dots` adds one dot per item; `nav` (default on) shows prev/next buttons that disable at the ends (no looping in v1). The settled index is detected from element rects (not `scrollLeft`, which is RTL-inconsistent), debounced after scrolling. `next`/`previous`/`goTo` smooth-scroll the target into view and, because a headless environment has no layout, update `index` and emit optimistically; the scroll listener reconciles in a real browser (guarded so an unchanged index does not re-emit). Under `prefers-reduced-motion` navigation jumps instantly (the composed `reducedMotion` snippet forces `scroll-behavior: auto`, and button navigation passes `behavior: "auto"`). ARIA follows the APG carousel pattern: the region carries `aria-roledescription="carousel"` and the `label`; each slotted item gets `role="group"`, `aria-roledescription="slide"`, and an "{n} of {total}" label, reconciled on every `slotchange` and locale change. Keyboard: with the viewport focused, ArrowRight/ArrowLeft move forward/back in the reading direction (RTL-aware). Deferred (not built): `loop`, autoplay (an accessibility liability), and vertical orientation.

> Swiping is native scroll-snap, so touch and trackpad work with no drag code and no WCAG 2.5.7 concern; the prev/next buttons are the non-drag path. `loop`, autoplay, and vertical orientation are intentionally not built (autoplay is an accessibility liability). Under `prefers-reduced-motion` button navigation jumps instantly instead of smooth-scrolling. Give the carousel a `label` so the region has an accessible name.

## Install

```bash
npm install @dojo-ng/carousel
```

## Usage

Import the package to register the custom element, then use the tag.

Each top-level slotted element is one item. `per-view` shows N at once (gap-adjusted), `dots` adds a dot per item, and `nav` (default) shows prev/next buttons that disable at the ends. Swiping is native scroll-snap. `dj-slide-change` fires with the settled `{ index }`. Give it a `label` for the region.

```html
<dj-carousel label="Featured" per-view="2" dots>
  <dj-card>One</dj-card>
  <dj-card>Two</dj-card>
  <dj-card>Three</dj-card>
</dj-carousel>
<script type="module">
  import "@dojo-ng/carousel";
  import "@dojo-ng/card";
  const c = document.querySelector("dj-carousel");
  c.addEventListener("dj-slide-change", (e) => console.log("slide", e.detail.index));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `perView` | per-view | `number` | `1` |
| `nav` | nav | `boolean` | `true` |
| `dots` | dots | `boolean` | `false` |
| `label` | label | `string` | — |

**Slots:** default

**Parts:** `viewport` (the scroller), `prev`, `next`, `dots`, `dot`

**Events:** `dj-slide-change` (detail `{ index }`)

**Methods:** `next()`, `previous()`, `goTo(index: number)`

**CSS properties:** `--dj-carousel-gap` (default `1rem`; Gap between items (also subtracted from the per-view basis).)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
