# Dojo NG theming proposal

A theming approach for the Dojo NG web components, with a working reference implementation
in `components/packages/theme`. It serves the project's principles: code quality,
performance, suitability for large applications, and being easy to add to an SPA.

## What we want from theming

A large application needs to restyle the whole component set from one place, support more
than one brand or a light/dark mode, switch themes at runtime without recompiling, and
still let a team override one component in one spot when needed. The theme should be a
separate, swappable artifact, not baked into each component.

## Prior art

Dojo 2 already worked this way. A theme was a separate package built with `dojo build
theme`. The structural CSS lived with the widget (the "default" theme: cursor, layout,
padding, with empty hooks like `.contained {}`), and a named theme (dojo, material) filled
in the skin. Each named theme carried a `variants/` folder of token files (default, dark)
that set CSS custom properties such as `--color-background` and `--font-family` on a root
class, and `theme.variant()` applied that class to switch token sets. So Dojo separated
structure from skin and expressed the skin as custom-property tokens, with variants as
swappable token sets.

Current web-component libraries converge on the same idea, minus Dojo's reactive
machinery. A Shoelace theme is "nothing more than a stylesheet" that defines `--sl-*`
design tokens at the page level, with a dark theme that mirrors the tokens and flips the
neutral scale; you load light or dark based on `prefers-color-scheme`. Spectrum scopes its
tokens with an `<sp-theme>` element that provides custom properties to everything in its
DOM. Material Web is likewise token-driven. The shared mechanism is CSS custom properties,
which pierce the shadow boundary and reach every component without per-component wiring.

## Proposal: layered tokens in a separate package

Ship theming as `@dojo-ng/theme`, independent of the components. It provides a token
stylesheet and a small scoping element.

Tokens are organized in three layers, so a re-theme touches the smallest surface that does
the job:

1. Primitives: raw scales with no meaning attached, e.g. `--dj-color-neutral-0` through `900`, the primary and status color scales, spacing, font sizes, radii.
2. Semantic roles: what a primitive is used for, e.g. `--dj-color-text`, `--dj-color-background`, `--dj-color-border`, `--dj-overlay-background-color`. These reference primitives.
3. Component tokens: the handful a component reads, e.g. `--dj-button-font-size-medium`, `--dj-input-height-medium`, `--dj-loading-linear-height`. These reference semantics or primitives.

A new brand overrides primitives and semantics; a one-off tweak overrides a component token.
Components consume tokens with a fallback value, for example
`var(--dj-color-primary-600, #2563eb)`, so a component still renders if the theme has not
loaded yet.

### Switching themes

The stylesheet defines the light set under `:root` and a dark set under
`[data-dj-theme="dark"]`, and falls back to the OS via `prefers-color-scheme` when no theme
is chosen. Switching at runtime is a single attribute change on `<html>` (or any
container): set `data-dj-theme` to `light` or `dark`. Because custom properties inherit and
cross shadow boundaries, every component updates with no JavaScript in the components
themselves. The reference playground toggles the whole page this way.

### Scoped theming

For more than one theme on a page, or a themed island inside an otherwise-light app, use the
`<dj-theme theme="dark">` element. It sets `data-dj-theme` on itself, and the tokens inherit
through its slot into descendants and their shadow roots. `theme="auto"` removes the
attribute so the subtree inherits the ambient theme. This mirrors Spectrum's `<sp-theme>`
and is demonstrated by the "dark island" in the playground.

### Deep overrides

Tokens cover the common cases. When a team needs to restyle an internal node that no token
exposes, components mark significant internals with `part` (`base`, `label`, `icon`,
`underlay`, `wrapper`), styleable from outside with `::part()`. This is the escape hatch, to
be used sparingly; tokens are the primary interface.

### Styling validation states

Form controls hide their `<input>` inside the shadow root, so `:invalid` / `:valid` are not
reachable from page CSS. The `FormControl` mixin (in `@dojo-ng/dojo-element`) closes that gap
by mirroring the control's current validity onto the host as data attributes, so you style
from outside without piercing the shadow root:

- `data-dj-required` — the control's `required` is set.
- `data-dj-valid` / `data-dj-invalid` — the control's current validity.
- `data-dj-user-valid` / `data-dj-user-invalid` — the same, but only after the user has
  interacted (blurred the control after editing it, or submitted the form). Prefer these for
  live feedback so a pristine field is not flagged before anyone has touched it.

```css
dj-text-input[data-dj-user-invalid] {
  --dj-input-border-color: var(--dj-color-danger-600);
}
```

The mixin only reads validity — each control still owns it via `ElementInternals`. Where the
engine supports `CustomStateSet`, the same five names are also exposed as custom states
(`:state(user-invalid)`, …); the data attributes are the portable, documented hook.

## How this compares to Dojo 2

The token model is the same, but Shadow DOM plus custom properties removes Dojo's
indirection. Dojo needed a "default theme" of empty classes plus a runtime `theme`
middleware to merge and inject class maps, because its widgets rendered into the light DOM
and class names had to be threaded through. With Shadow DOM, a component owns its structural
CSS privately and reads tokens that cascade in from the page, so there is no class merging,
no theme injector, and no build step to assemble a theme. A theme is a plain stylesheet plus
optional token files, which is lighter to build, ship, and reason about.

## Reference implementation

`components/packages/theme` contains `theme.css` (the three token layers, light and dark,
plus an OS-preference fallback) and `<dj-theme>` (the scoping element). The six existing
components already read these tokens, so loading `theme.css` skins the whole set, and the
playground's toggle re-themes everything live. A check confirms every `--dj-*` token the
components reference is defined by the theme.

## Adding a brand theme

Copy `theme.css`, override the primitive color scales and any semantics that differ, and
load it instead of the default. Components need no change. A brand that only adjusts a few
values can instead ship a short stylesheet that sets just those custom properties on
`:root` after the base theme.

## References

- Shoelace, Themes and Customizing: https://shoelace.style/getting-started/themes
- Spectrum Web Components, Theme: https://opensource.adobe.com/spectrum-web-components/components/theme/
- Material Web theming: https://github.com/material-components/material-web/tree/main/docs/theming
- Design tokens with CSS custom properties: https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/
