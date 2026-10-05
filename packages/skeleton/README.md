# @dojo-ng/skeleton

`<dj-skeleton>` — A loading placeholder that stands in for content while it loads.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

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

## Size and shape

- Style the host with CSS; there are no shape properties. It is `display: block`, `1em` high by default, with the theme's border radius.
- For a line of text, give it a short height and a width. For an avatar, make it square and add `border-radius: 50%`.
- `effect="sheen"` (the default) shows a moving sheen; `effect="none"` shows a still surface.

## Accessibility

- The skeleton is always `aria-hidden="true"`, because it is decoration.
- Mark the region that is loading with `aria-busy="true"` until the real content arrives. Screen readers then announce the loading state once for the region, not once per placeholder.
- Under `prefers-reduced-motion`, the sheen does not move, whatever `effect` says.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `effect` | effect ↻ | `SkeletonEffect` | `"sheen"` |

## CSS parts

- `base`: The placeholder surface.

## Examples

### No animation

`effect="none"` for a static placeholder.

```html
<dj-skeleton effect="none" style="height:16px;width:200px"></dj-skeleton>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
