# @dojo-ng/snackbar

## 0.1.3

### Patch Changes

- Snackbar and tooltip accessibility (CB33). `dj-snackbar` keeps its live regions in the accessibility tree while closed and writes the message into them on open, so screen readers announce it; `type="error"` announces assertively (`role="alert"`). The success fill is `--dj-color-success-700` with white text (5.0:1; it was 3.3:1). A closed snackbar's host is no longer `display: none`, only its bar.

  `dj-tooltip` sets `aria-describedby` on the slotted trigger, pointing at the slotted tip. Where the Popover API exists the tip renders in the top layer, so an `overflow: hidden` or transformed ancestor no longer clips it, and it flips to the opposite side when the preferred side has no room.

- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2

## 0.1.1

### Patch Changes

- Fix the README's lead description having a `@cssprop` doc block glued onto the end of its prose (a doc-generator bug that affected any component whose JSDoc has no Slots/Parts/Events/Methods section label). No code change; README and manifest description text only.
