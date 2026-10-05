# @dojo-ng/dnd

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.

## 0.1.1

### Patch Changes

- Fix a draggable item's own click handler never firing. `pointerdown` no longer calls `preventDefault()` unconditionally; a plain click (or any movement under a 5px threshold) now reaches the browser's native click synthesis, and only a real drag past that threshold suppresses the default.
