# @dojo-ng/dojo-element

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.

## 0.1.1

### Patch Changes

- Export `TokenFlagController`, a ~25-line `ResizeObserver` + `getComputedStyle` primitive that
  reads a `--dj-*` custom property boolean flag and keeps it current across resizes (`refresh()`
  covers a runtime pin or theme switch that comes with no resize). `@dojo-ng/nav` is its first
  consumer.

  Also: `collectFocusables` now walks the shadow tree in composed order, resolving each `<slot>`
  to its flattened assigned elements (falling back to the host's light DOM only when the shadow
  tree has no slot at all) instead of only ever checking the host's light DOM wholesale. A
  component that redistributes its own default slot one level deeper through a composed child's
  slot — `dj-nav` through `dj-slide-pane`'s — previously broke `dj-dialog`-style focus traps down
  to whatever the outer shadow root's own controls were, silently missing the real content.
  Existing trap behavior for a host with no redistributed slot (the common case, e.g. `dj-dialog`)
  is unchanged.
