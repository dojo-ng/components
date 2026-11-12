# @dojo-ng/dropdown

## 0.1.4

### Patch Changes

- Updated dependencies
  - @dojo-ng/list@0.2.0

## 0.1.3

### Patch Changes

- One Escape now closes one overlay (CB25). Dialogs, slide panes, popups, tooltips and the nav panel share one keyboard stack (`pushOverlay` in `@dojo-ng/dojo-element`) instead of a `document` listener each, so Escape goes to the overlay opened last: a select's list inside a dialog closes first and the dialog stays open. Tab trapping follows the same rule.

  `dj-close` from dialog, slide-pane, popup and dropdown no longer bubbles. Before, a select's or dropdown's inner popup closing reached `dj-close` listeners on an outer dialog (so a confirm dialog read it as "No"), and a dropdown fired `dj-close` twice. Listen on the element itself, as every documented example already does. `dj-context-popup` and `dj-trigger-popup` now emit their own `dj-close`.

  Dialog: always `aria-modal="true"` (it always traps focus), named by its `title` slot or the host's `aria-label`, and a `role` attribute on the host is moved to the inner dialog element so there is one dialog role, not two. Focus returns to the control that had it even when that control is inside another component's shadow root. Slide-pane is `aria-modal` while open, is labelled by its title, and now returns focus on close.

- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5
  - @dojo-ng/popup@0.1.2

## 0.1.2

### Patch Changes

- `dj-dropdown` no longer closes on a `change` from any input in its panel (CB31). Only a choice from the menu list closes it, so a panel with a text field, checkbox, or select stays open while the user works in it.
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.4
  - @dojo-ng/list@0.1.3

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/list@0.1.2
  - @dojo-ng/popup@0.1.1
