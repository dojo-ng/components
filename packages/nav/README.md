# @dojo-ng/nav

`<dj-nav>` — A navigation landmark that collapses into a button and a panel when there is not enough room.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

This is the "hamburger menu" or "navicon" pattern. A menu button that stays collapsed on a wide desktop screen is a normal use too, not only a mobile layout. Put the links in the default slot as plain `<a>` elements.

## Install

```bash
npm install @dojo-ng/nav
```

## Usage

Import the package to register the custom element, then use the tag.

Plain links in a `<nav>` landmark. Give it a `label` for the landmark.

```html
<dj-nav label="Site">
  <a href="/docs">Docs</a>
  <a href="/blog">Blog</a>
  <a href="/pricing">Pricing</a>
  <a href="/about">About</a>
</dj-nav>
```

## When it collapses

- By default the nav collapses when its container is narrower than 45rem.
- To change that, set the `--dj-nav-collapsed` custom property on the element: 1 collapses, 0 expands. Because it is a theme token, not a breakpoint property, it can depend on the container: a nav in a narrow sidebar collapses even on a wide screen.
- The component checks again when its own size changes. After a change that does not resize it, such as a theme switch or a media query on the viewport, call `refresh()`.
- Only one arrangement is in the DOM at a time: the plain `<nav>` when expanded, or the button (and, while open, a panel around the same `<nav>`) when collapsed.

## The panel

- `panel="drawer"` (the default) uses `<dj-slide-pane>`, which opens from the side of the reading direction.
- `panel="dropdown"` and `panel="overlay"` are drawn inside the component itself.
- `dj-nav-toggle` fires when the panel opens or closes, and `dj-nav-collapse` when the arrangement changes.

## Accessibility

- This is a disclosure, not a menu (in APG terms): the links stay plain links in a `<nav>`, and the button has no `aria-haspopup`.

## Not built

- Toolbar-style overflow, which shows what fits and moves the rest into a menu. That is a separate component.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `label` | label | `string` | — |
| `open` | open ↻ | `boolean` | `false` |
| `panel` | panel ↻ | `"drawer" \| "dropdown" \| "overlay"` | `"drawer"` |
| `triggerLabel` | trigger-label | `string` | — |
| `collapsed` | collapsed ↻ | `boolean` | `false` |

## Slots

- default slot: The links — plain `<a>` elements.
- `trigger`

## CSS parts

- `trigger`
- `panel`
- `nav`

## Events

- `dj-nav-collapse`: Detail `{ collapsed }`.
- `dj-nav-toggle`: Detail `{ open }`.

## Methods

- `show()`
- `hide()`
- `toggle()`
- `refresh()`: Delegates to `TokenFlagController` — the escape hatch for a runtime pin or theme switch that `ResizeObserver` cannot see (it only sees size changes).

## Examples

### Permanent hamburger

Pin the token directly for a nav that is always collapsed, on any screen — no JS, no special case in the component: it is the same threshold token an app can set on a single instance.

```html
<dj-nav label="Site" style="--dj-nav-collapsed: 1">
  <a href="/docs">Docs</a>
  <a href="/blog">Blog</a>
</dj-nav>
```

### Moving the threshold

`45rem` is a default, not a hardcoded number. Override it per instance with your own `@container` query on an ancestor that establishes `container-type` — set BOTH branches (the default below your threshold, `0` above it), since setting the token at all replaces the component's own rule entirely rather than adjusting it.

```html
<style>
  #wide-nav { container-type: inline-size; }
  #wide-nav dj-nav { --dj-nav-collapsed: 1; }
  @container (min-width: 30rem) {
    #wide-nav dj-nav { --dj-nav-collapsed: 0; }
  }
</style>
<div id="wide-nav">
  <dj-nav label="Site">
    <a href="/docs">Docs</a>
    <a href="/blog">Blog</a>
  </dj-nav>
</div>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
