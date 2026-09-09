# @dojo-ng/nav

`<dj-nav>` — A nav landmark that collapses into a trigger + panel below a threshold.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A nav landmark that collapses into a trigger + panel below a threshold. The threshold is the `--dj-nav-collapsed` custom property (0 or 1), read via `TokenFlagController` rather than a `breakpoint` prop, so it lives in the existing `--dj-*` theme system and is container-aware: a nav inside a narrow sidebar on a wide screen collapses. One arrangement is ever in the DOM — never both, hidden: the plain `<nav>` when expanded, or the trigger plus (while open) a panel wrapping that same `<nav>` when collapsed. `panel` picks the collapsed presentation: `"drawer"` composes `<dj-slide-pane>` (its `align` follows the reading direction); `"dropdown"` and `"overlay"` are positioned in this component's own shadow DOM. This is a disclosure, not a menu button — the links are plain slotted `<a>` elements in a `<nav>`, never `dj-list`/`dj-tree`, and the trigger carries no `aria-haspopup`.

> Also called a hamburger menu or navicon, and this is how you'd build responsive navigation with it — none of those words are in the API, because a permanent desktop hamburger is a first-class use here, not a mobile-only special case. The links are plain `<a>` elements in a `<nav>`, never `dj-list`/`dj-tree` — this is a disclosure (APG terms), not a menu, so the trigger deliberately carries no `aria-haspopup`. `refresh()` exists because `ResizeObserver` only sees size changes: call it after a runtime pin, a theme switch, or a viewport media query crossing while the host's own width is unchanged — there is no cross-component theme-change watching built in, by design. Toolbar-style overflow (show what fits, collapse the rest into a menu) is a related but separate component, not this one.

## Install

```bash
npm install @dojo-ng/nav
```

## Usage

Import the package to register the custom element, then use the tag.

The default slot is plain `<a>` elements inside a `<nav>` landmark. Below the `--dj-nav-collapsed` threshold (`45rem` by default) it swaps to a trigger button plus a `panel` (`drawer` by default) containing the same links — one arrangement is ever in the DOM, so resizing never duplicates the link set. Give it a `label` for the landmark.

```html
<dj-nav label="Site">
  <a href="/docs">Docs</a>
  <a href="/blog">Blog</a>
  <a href="/pricing">Pricing</a>
  <a href="/about">About</a>
</dj-nav>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `label` | label | `string` | — |
| `open` | open ↻ | `boolean` | `false` |
| `panel` | panel ↻ | `"drawer" \| "dropdown" \| "overlay"` | `"drawer"` |
| `triggerLabel` | trigger-label | `string` | — |
| `collapsed` | collapsed ↻ | `boolean` | `false` |

**Slots:** default (the links — plain `<a>` elements), `trigger`

**Parts:** `trigger`, `panel`, `nav`

**Events:** `dj-nav-collapse` (detail `{ collapsed }`), `dj-nav-toggle` (detail `{ open }`)

**Methods:** `show()`, `hide()`, `toggle()`, `refresh()` (Delegates to `TokenFlagController` — the escape hatch for a runtime pin or theme switch that `ResizeObserver` cannot see (it only sees size changes).)

**CSS properties:** `--dj-nav-collapsed` (default `1`; The threshold flag read by TokenFlagController; 0 keeps the inline arrangement, 1 collapses it. Any value a consumer sets (directly, inherited from `:root`, or from their own `@container`/`@media` rule) wins over the component's own 45rem default — set it directly for a permanent hamburger, set both branches to move the flip point, or set it to `initial` to release an inherited pin.), `--dj-nav-gap` (default `1rem`; Gap between links in the inline arrangement.), `--dj-slide-pane-size` (Passed through to the drawer presentation.)

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

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
