# Dojo NG component conventions

How Dojo NG web components are built. These conventions exist to serve the project's
guiding principles, in priority order: code quality, performance, suitability for
large web applications, and being easy to set up and add dynamically to an SPA.

## Foundation

Components are custom elements built on Lit 3. Every component extends `DojoElement`
(package `@dojo-ng/dojo-element`), a thin `LitElement` subclass that adds:

- `emit(name, options?)`: dispatch a `CustomEvent` that bubbles and is composed by default, with typed detail.
- `static define(tag, ctor?, options?)`: register a custom element. It is idempotent and, when a tag is already registered, compares `static version` and warns on a mismatch instead of throwing.
- `static dependencies`: a map of child components that auto-register when the element is constructed.
- Reflected-property morph fixing, so an attribute reset to `null` falls back to the property's initial value.

We build our own components rather than wrapping a third-party library. That keeps the
API, performance characteristics, and accessibility under our control across all 60
widgets to migrate.

## Naming

A component named "action button" is expressed consistently across four places:

- Tag: `<dj-action-button>` (the `dj-` prefix matches the `--dj-*` token namespace).
- Class: `DjActionButton`.
- Component file: `dj-action-button.ts`.
- Package: `@dojo-ng/action-button`.

Tags, files, and CSS tokens are kebab-case; classes are PascalCase.

## Package layout

One package per component. A package holds its source under `src/` and compiles to
`dist/`:

```
packages/<name>/
  package.json
  tsconfig.json
  src/
    dj-<name>.ts          component class
    dj-<name>.styles.ts   Lit css`` styles
    index.ts              registers the element, re-exports the class
```

`index.ts` registers the element as a side effect of import and also exports the class:

```ts
import { DjButton } from "./dj-button.js";
export * from "./dj-button.js";
export default DjButton;
DjButton.define("dj-button", DjButton);
```

Importing the package is therefore enough to make the tag work. That is what lets a
lazily loaded SPA route pull in a component on demand and have its markup come alive
immediately. Code that wants the class without registering can import the component
module directly.

## Properties, attributes, and events

Public API is declared with Lit's `@property`. Reflect a property to an attribute only
when CSS needs it (for example `disabled` and `kind`), so styling can key off
`:host([disabled])`. Map camelCase properties to kebab attributes explicitly, e.g.
`@property({ attribute: "icon-position" })`.

Prefer native DOM events. A native `click` already bubbles and is composed, so it
crosses the shadow boundary and consumers listen for `click` exactly as they would on a
plain button. Reserve `emit()` for semantics that have no native equivalent, and never
re-emit a native event under its own name (the prototype did this and it produced
duplicate events).

## Encapsulation and theming

Components render into a shadow root. Theming is driven by `--dj-*` CSS custom
properties, which pierce the shadow boundary, so a host app themes components by setting
tokens on any ancestor. Each token is used with a fallback value
(`var(--dj-color-primary-600, #2563eb)`) so a component is usable before a full theme
loads. Expose deep styling hooks with `part="..."` on significant internal nodes
(`base`, `label`, `icon`), styleable from outside via `::part()`.

A component that should inherit the surrounding theme rather than impose its own (the
action button) subclasses the base component and sets no token overrides; because tokens
inherit through the shadow boundary, inheritance is automatic.

## Build and consumption

Each package compiles with the TypeScript compiler to ESM, with declarations. Packages
use TypeScript project references, so one command builds the graph in dependency order:

```
npx tsc -b packages/action-button
```

There is no bundler. Components are plain ES modules resolved through an import map,
which is the lightest path to loading them dynamically in an SPA. `playground/index.html`
demonstrates this: an import map points `lit` at a CDN and the `@dojo-ng/*` packages at
their built `dist/`, and a script adds a component to the page at runtime.

## Accessibility and focus

Set `aria-disabled` alongside the native `disabled` attribute, use `:focus-visible` for
focus rings, and forward `focus()`/`blur()` to the internal interactive node so the host
can drive focus through the custom element.

## Accessibility and mobile (standing requirements)

These are project requirements for every component, to be met as fully as possible at the
component level.

Target WCAG 2.2 AA. Beyond the 2.1 carryovers (keyboard operability 2.1.1, visible focus
2.4.7, text contrast 1.4.3, non-text/UI contrast 1.4.11), mind the 2.2 additions that land
at the component level: target size minimum of 24×24 CSS px (2.5.8), focus not obscured
(2.4.11), and a non-dragging alternative for any drag interaction (2.5.7) — so sliders rely
on native range keyboard input and the slide-pane must keep button/keyboard close in
addition to any swipe. Each interactive element needs a visible focus indicator on the real
control, correct roles/labels, and roving tabindex for grouped controls.

Provide a high-contrast theme as a token variant (`[data-dj-theme="high-contrast"]`)
alongside light and dark, and additionally honor `forced-colors: active` (Windows High
Contrast) so components degrade to system colors rather than breaking.

Every component must be usable on mobile: touch targets sized for fingers, layouts that
reflow without overflow, pointer/touch event support, and equivalents for hover-only
affordances (e.g. the tooltip, which is hover/focus today and needs a touch path). Test each
component in a narrow viewport.

## Browser baseline and polyfills

Baseline: modern evergreen browsers plus older Safari (≈ Safari 15+), since some users are
stuck on Apple devices that can't update. (The Holmes Corp browser matrix is stale and is
not the target.) This baseline is also roughly the floor of our engines (Lit 3, Lexical,
TanStack), so we can't go below it regardless of polyfills.

Components bundle no polyfills, and we never hand-author any. We document the baseline and
recommend specific, well-maintained polyfills as optional *app-level* prerequisites the
consumer loads when needed:

- `element-internals-polyfill` — REQUIRED for the baseline. Form-associated custom elements (`attachInternals`/`setFormValue`/validity) landed in Safari 16.4, so Safari 15–16.3 need this for every form control. Load it before the components.
- core-js — NOT needed at this baseline (Safari 15 is a modern JS engine). Only relevant if a consumer must support browsers below the baseline; it covers the JS standard library, not DOM/web-platform APIs.

Container queries predate Safari 16, so the column-layout components must carry a
`@media`-based fallback (degrade to expanded/stacked) rather than rely on a container-query
polyfill. Prefer native CSS fallbacks over runtime polyfills wherever a feature can degrade
gracefully.

## Form controls

Form-associated components (inputs, select, checkbox, and similar) implement the
`DojoFormControl` interface exported from `@dojo-ng/dojo-element`, which defines the
constraint-validation surface (`validity`, `checkValidity`, `setCustomValidity`, and so
on). Button is not form-associated; it handles `type="submit"`/`"reset"` by acting on the
closest `<form>`.
