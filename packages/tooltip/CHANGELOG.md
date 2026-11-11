# @dojo-ng/tooltip

## 0.1.3

### Patch Changes

- One Escape now closes one overlay (CB25). Dialogs, slide panes, popups, tooltips and the nav panel share one keyboard stack (`pushOverlay` in `@dojo-ng/dojo-element`) instead of a `document` listener each, so Escape goes to the overlay opened last: a select's list inside a dialog closes first and the dialog stays open. Tab trapping follows the same rule.

  `dj-close` from dialog, slide-pane, popup and dropdown no longer bubbles. Before, a select's or dropdown's inner popup closing reached `dj-close` listeners on an outer dialog (so a confirm dialog read it as "No"), and a dropdown fired `dj-close` twice. Listen on the element itself, as every documented example already does. `dj-context-popup` and `dj-trigger-popup` now emit their own `dj-close`.

  Dialog: always `aria-modal="true"` (it always traps focus), named by its `title` slot or the host's `aria-label`, and a `role` attribute on the host is moved to the inner dialog element so there is one dialog role, not two. Focus returns to the control that had it even when that control is inside another component's shadow root. Slide-pane is `aria-modal` while open, is labelled by its title, and now returns focus on close.

- Snackbar and tooltip accessibility (CB33). `dj-snackbar` keeps its live regions in the accessibility tree while closed and writes the message into them on open, so screen readers announce it; `type="error"` announces assertively (`role="alert"`). The success fill is `--dj-color-success-700` with white text (5.0:1; it was 3.3:1). A closed snackbar's host is no longer `display: none`, only its bar.

  `dj-tooltip` sets `aria-describedby` on the slotted trigger, pointing at the slotted tip. Where the Popover API exists the tip renders in the top layer, so an `overflow: hidden` or transformed ancestor no longer clips it, and it flips to the opposite side when the preferred side has no room.

- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5

## 0.1.2

### Patch Changes

- Escape now dismisses a visible tooltip without moving focus (WCAG 1.4.13 dismissable). The listener is added on show and removed on hide and on disconnect.

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
