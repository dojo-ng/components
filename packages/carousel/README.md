# @dojo-ng/carousel

`<dj-carousel>` — A slotted, swipeable carousel.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Each top-level element in the default slot is one item: a card, an image, a tile, or any other content.

Swiping is native scrolling. The item strip is a horizontal scroll container with CSS scroll-snap, so touch and trackpad work with no drag code, and the prev/next buttons give a way to move that needs no dragging (WCAG 2.5.7). Give the carousel a `label` so the region has an accessible name.

## Install

```bash
npm install @dojo-ng/carousel
```

## Usage

Import the package to register the custom element, then use the tag.

Two items per view, with page dots. `dj-slide-change` reports the new index.

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

## Layout

- `per-view` shows that many items at once, sized to fit with the gap between them.
- `dots` adds one dot per page. With `per-view` above 1, the last items cannot start a page, so the number of pages is items − `per-view` + 1.
- `nav` (on by default) shows prev/next buttons. They are disabled at the first and last page; the carousel does not loop.

## Moving between items

- `next()`, `previous()`, and `goTo(index)` scroll smoothly to the item.
- Under `prefers-reduced-motion`, the carousel jumps to the item instead of scrolling.
- `dj-slide-change` fires when the current item changes, from swiping, a button, a key, or a method call.

## Accessibility

- The carousel follows the APG carousel pattern. The region has `aria-roledescription="carousel"` and the `label` as its name.
- Each item gets `role="group"`, `aria-roledescription="slide"`, and an "{n} of {total}" label. These update when items are added or removed and when the locale changes.
- With the strip focused, ArrowRight and ArrowLeft move forward and back in the reading direction, so they also work in right-to-left pages.

## Not built

- Looping, autoplay (an accessibility problem), and vertical orientation.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `perView` | per-view | `number` | `1` |
| `nav` | nav | `boolean` | `true` |
| `dots` | dots | `boolean` | `false` |
| `label` | label | `string` | — |

## Slots

- default slot: Each top-level element is one carousel item.

## CSS parts

- `viewport`: The scroller.
- `prev`
- `next`
- `dots`
- `dot`

## Events

- `dj-slide-change`: Detail `{ index }`.

## Methods

- `next()`
- `previous()`
- `goTo(index: number)`

## CSS custom properties

- `--dj-carousel-gap`: Gap between items (also subtracted from the per-view basis). Default `1rem`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
