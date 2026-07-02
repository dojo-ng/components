# Dojo NG framework typings

Generated from `custom-elements.json` by `gentypes.py` (run `npm run types`).
These add type-checking for the `dj-*` custom elements in React, Solid, and Vue.
They are **types only** — Dojo NG components are standard custom elements that
pass Custom Elements Everywhere, so no runtime wrappers are needed.

Prop value types are taken straight from the component classes (e.g.
`DjButton["kind"]`), so they always match the components.

## React (19+)

Reference the declaration once (e.g. in your app's `env.d.ts` or any file in the
compilation):

```ts
/// <reference types="@dojo-ng/components/types/react" />
```

Attributes are keyed by their HTML name (`icon-position`); React 19 also accepts
the camelCase property form. Custom events have no standard JSX form — bind them
with a `ref` + `addEventListener`.

## Solid

```ts
/// <reference types="@dojo-ng/components/types/solid" />
```

Props are keyed by attribute name; custom events use Solid's `on:` syntax, e.g.
`<dj-dialog on:dj-close={...}>`, typed for you.

## Vue 3

```ts
/// <reference types="@dojo-ng/components/types/vue" />
```

Props and events are typed on `GlobalComponents`, so templates type-check:
`<dj-select :options="opts" @change="..." />`. Bind events with `@dj-close`.

## Dojo NG renderer (tsx)

```ts
/// <reference types="@dojo-ng/components/types/dojo" />
```

Registers the `dj-` tags on the renderer's `tsx.JSX.IntrinsicElements`, so `.tsx`
written against `@dojo-ng/framework`'s `tsx` factory type-checks
(`<dj-button kind="outlined">`). Requires the renderer to ship its base JSX types
(the `tsx.JSX` namespace) — the same way the other targets require their
framework's types.

Regenerate after any component change: `npm run cem && npm run types`.
