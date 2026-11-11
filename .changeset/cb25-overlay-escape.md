---
"@dojo-ng/dojo-element": patch
"@dojo-ng/dialog": patch
"@dojo-ng/popup": patch
"@dojo-ng/slide-pane": patch
"@dojo-ng/dropdown": patch
"@dojo-ng/context-popup": patch
"@dojo-ng/trigger-popup": patch
"@dojo-ng/tooltip": patch
"@dojo-ng/nav": patch
---

One Escape now closes one overlay (CB25). Dialogs, slide panes, popups, tooltips and the nav panel share one keyboard stack (`pushOverlay` in `@dojo-ng/dojo-element`) instead of a `document` listener each, so Escape goes to the overlay opened last: a select's list inside a dialog closes first and the dialog stays open. Tab trapping follows the same rule.

`dj-close` from dialog, slide-pane, popup and dropdown no longer bubbles. Before, a select's or dropdown's inner popup closing reached `dj-close` listeners on an outer dialog (so a confirm dialog read it as "No"), and a dropdown fired `dj-close` twice. Listen on the element itself, as every documented example already does. `dj-context-popup` and `dj-trigger-popup` now emit their own `dj-close`.

Dialog: always `aria-modal="true"` (it always traps focus), named by its `title` slot or the host's `aria-label`, and a `role` attribute on the host is moved to the inner dialog element so there is one dialog role, not two. Focus returns to the control that had it even when that control is inside another component's shadow root. Slide-pane is `aria-modal` while open, is labelled by its title, and now returns focus on close.
