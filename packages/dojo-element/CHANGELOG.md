# @dojo-ng/dojo-element

## 0.1.5

### Patch Changes

- Boolean properties that default to `true` can now be turned off from HTML (CB24). Before, any present attribute read as `true`, so `<dj-dialog closeable="false">` stayed closeable. Now the attribute value `"false"` (any case) means `false`, any other value means `true`, and leaving the attribute out keeps the `true` default. This covers dialog `closeable`/`underlay`, slide-pane `underlay`, popup `scroll-lock`, carousel `nav`, trigger-popup `match-width`, title-pane `closeable`, slider `show-output`, radio `tabbable`, typeahead `strict`, alert `open`, and loading-indicator `active`. `@dojo-ng/dojo-element` exports the converter as `defaultTrueBoolean`.
- One Escape now closes one overlay (CB25). Dialogs, slide panes, popups, tooltips and the nav panel share one keyboard stack (`pushOverlay` in `@dojo-ng/dojo-element`) instead of a `document` listener each, so Escape goes to the overlay opened last: a select's list inside a dialog closes first and the dialog stays open. Tab trapping follows the same rule.

  `dj-close` from dialog, slide-pane, popup and dropdown no longer bubbles. Before, a select's or dropdown's inner popup closing reached `dj-close` listeners on an outer dialog (so a confirm dialog read it as "No"), and a dropdown fired `dj-close` twice. Listen on the element itself, as every documented example already does. `dj-context-popup` and `dj-trigger-popup` now emit their own `dj-close`.

  Dialog: always `aria-modal="true"` (it always traps focus), named by its `title` slot or the host's `aria-label`, and a `role` attribute on the host is moved to the inner dialog element so there is one dialog role, not two. Focus returns to the control that had it even when that control is inside another component's shadow root. Slide-pane is `aria-modal` while open, is labelled by its title, and now returns focus on close.

## 0.1.4

### Patch Changes

- Fix the focus trap used by `dj-dialog` and `dj-slide-pane` (CB29). It no longer counts elements the user cannot reach as Tab stops: hidden or inert elements, ones inside `display: none` or a closed `<details>`, `visibility: hidden`, `input[type=hidden]`, and anything with a negative `tabindex`. A hidden last stop used to make the wrap fail, so Tab left the dialog. It now counts `contenteditable` elements and a `<details>` summary, which it missed. If a stop still refuses focus when Tab wraps, the trap moves on to the next one instead of letting focus escape.
- Fix form reset and `dj-form` (CB30).

  - Every form control now has `defaultValue`, the `value` attribute, as on a native input. A form reset returns each control to it. Before, some controls went back to the attribute and others (`dj-select`, `dj-list`, `dj-radio-group`, `dj-time-picker`, `dj-typeahead`, `dj-rate`, `dj-checkbox-group`, `dj-chip-typeahead`, `dj-range-slider`) always went back to empty.
  - `dj-form` treats only form controls as fields: `dj-*` form controls and native inputs, selects, and text areas. A named title pane, button, or icon is no longer gathered on submit or cleared on reset.
  - `dj-form` submits native controls the way a native form does. A native text input was left out before, because it has a `checked` property that is always false. A multi-select now submits every selected option.
  - `dj-form`'s `reset()` resets native controls the native way (a checkbox goes back to its `checked` attribute instead of having its value erased), and it clears the `user-valid`/`user-invalid` states, as a native form reset does. Form controls get a `resetInteraction()` method for this.
  - A required `dj-radio-group` now shows as valid when the choice is made with the arrow keys, not only with a click.

- Fix form controls that stayed disabled after `disabled` was turned back off (CB34). The browser reports the control's own `disabled` change while Lit is part way through an update, and that change was lost, so the inner control (the `dj-select` trigger, the native input) stayed disabled even though the host looked enabled. The control now renders again once the update finishes. `dj-radio-group` also re-enables the slotted radios it disabled when the group is enabled again, and leaves alone any radio the page disabled itself.

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
