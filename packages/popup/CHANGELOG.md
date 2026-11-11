# @dojo-ng/popup

## 0.1.2

### Patch Changes

- Boolean properties that default to `true` can now be turned off from HTML (CB24). Before, any present attribute read as `true`, so `<dj-dialog closeable="false">` stayed closeable. Now the attribute value `"false"` (any case) means `false`, any other value means `true`, and leaving the attribute out keeps the `true` default. This covers dialog `closeable`/`underlay`, slide-pane `underlay`, popup `scroll-lock`, carousel `nav`, trigger-popup `match-width`, title-pane `closeable`, slider `show-output`, radio `tabbable`, typeahead `strict`, alert `open`, and loading-indicator `active`. `@dojo-ng/dojo-element` exports the converter as `defaultTrueBoolean`.
- One Escape now closes one overlay (CB25). Dialogs, slide panes, popups, tooltips and the nav panel share one keyboard stack (`pushOverlay` in `@dojo-ng/dojo-element`) instead of a `document` listener each, so Escape goes to the overlay opened last: a select's list inside a dialog closes first and the dialog stays open. Tab trapping follows the same rule.

  `dj-close` from dialog, slide-pane, popup and dropdown no longer bubbles. Before, a select's or dropdown's inner popup closing reached `dj-close` listeners on an outer dialog (so a confirm dialog read it as "No"), and a dropdown fired `dj-close` twice. Listen on the element itself, as every documented example already does. `dj-context-popup` and `dj-trigger-popup` now emit their own `dj-close`.

  Dialog: always `aria-modal="true"` (it always traps focus), named by its `title` slot or the host's `aria-label`, and a `role` attribute on the host is moved to the inner dialog element so there is one dialog role, not two. Focus returns to the control that had it even when that control is inside another component's shadow root. Slide-pane is `aria-modal` while open, is labelled by its title, and now returns focus on close.

- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
