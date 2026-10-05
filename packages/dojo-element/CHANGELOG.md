# @dojo-ng/dojo-element

## 0.1.3

### Patch Changes

- Fix form validation bugs found while writing the Forms & validation guide.

  - `dj-form`: `submit()` now checks the named controls and does not emit `dj-submit` while one is invalid (set `novalidate` to skip the check). An unchecked checkbox or switch and disabled controls are left out of the data, a name used by several checked controls gives an array, and Enter in a text area no longer submits.
  - `dj-checkbox`, `dj-switch`, `dj-radio`: a form reset returns them to their checked state from the markup. Before, a box checked by the user stayed checked.
  - `dj-text-input` and the inputs built on it: `setCustomValidity()` now works. Before, the message was cleared at once.
  - `dj-text-input`, `dj-text-area`: after a failed submit or `checkValidity()`, the field shows its invalid state and message without waiting for an edit.
  - `dj-checkbox-group`: a `value` set from code now reaches the form, and the group supports `required`.
  - Every form control now has `validationMessage`, `checkValidity()`, and `reportValidity()`. The "required" messages of `dj-select`, `dj-radio-group`, `dj-typeahead`, and `dj-checkbox-group` are localized through `@dojo-ng/i18n`, and `dj-checkbox` and `dj-native-select` use the browser's own message.

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
