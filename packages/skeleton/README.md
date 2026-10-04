# @dojo-ng/skeleton

`<dj-skeleton>` — A loading placeholder that stands in for content while it loads.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Shape and size come from consumer CSS on the host: it is `display: block` with a default height of `1em` and a token border-radius. Style the host to size each placeholder — a circular avatar is `border-radius: 50%`, a text line is a short height with a width. No shape prop is needed.

Always `aria-hidden="true"`: the placeholder itself is decorative. Mark the region that is loading with `aria-busy="true"` until the real content lands, so assistive tech announces the loading state once for the whole region.

`prefers-reduced-motion` disables the sheen regardless of `effect` (the shared reducedMotion snippet collapses the animation).

> Size and shape come from your CSS on the host, not from props: give it a width/height for a text line, or a square plus `border-radius: 50%` for an avatar. The skeleton is always `aria-hidden`; mark the region that is loading with `aria-busy="true"` until the real content lands so the loading state is announced once for the whole region, not per placeholder. `prefers-reduced-motion` stills the sheen automatically.

## Install

```bash
npm install @dojo-ng/skeleton
```

## Usage

Import the package to register the custom element, then use the tag.

Size each placeholder with host CSS; mark the region `aria-busy` until content lands.

```html
<div aria-busy="true" style="display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;max-width:320px">
  <dj-skeleton style="width:48px;height:48px;border-radius:50%"></dj-skeleton>
  <div style="display:grid;gap:8px">
    <dj-skeleton style="height:12px;width:60%"></dj-skeleton>
    <dj-skeleton style="height:12px"></dj-skeleton>
    <dj-skeleton style="height:12px;width:80%"></dj-skeleton>
  </div>
</div>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `effect` | effect ↻ | `SkeletonEffect` | `"sheen"` |

## CSS parts

- `base`: The placeholder surface.

## CSS custom properties

- `--dj-skeleton-color`: Placeholder fill. Default `var(--dj-color-neutral-200)`.
- `--dj-skeleton-sheen-color`: Color of the sweeping sheen band. Default `rgb(255 255 255 / 0.55)`.
- `--dj-skeleton-radius`: Corner radius. Default `var(--dj-input-border-radius-small)`.

## Examples

### No animation

`effect="none"` for a static placeholder.

```html
<dj-skeleton effect="none" style="height:16px;width:200px"></dj-skeleton>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
