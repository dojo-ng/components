# @dojo-ng/data-grid

## 0.2.0

### Minor Changes

- Give `dj-data-grid` a supported way to take focus and to style its keyboard cursor. `focus()` and `blur()` on the host now reach the inner `role="grid"` element. The focus ring moves to that element (it was styled on an inner box that never takes focus, so it never showed), and the active row gets an inset bar while the grid is focused. The active row and each selected row carry new parts, `row--active` and `row--selected`, merged with any parts a plugin adds such as `row--unread`. A new `dj-active-change` event (detail `{ index, row }`) fires when the user moves the active row by key or click; setting `activeIndex` from code stays silent. Because a row can now carry several parts, select rows with `[part~="row"]` rather than `[part="row"]`. The rowstate plugin's documentation is updated to match.

### Patch Changes

- Keep a selected row's tint while the pointer is over it. In `dj-data-grid`'s own styles, the hover rule outranked the selected rule, so a ticked row turned the plain hover color under the pointer and read as unticked. Forced-colors mode had the same problem: a hovered selected row dropped from `Highlight` to `Canvas`. Selected rows now keep their selection colors when hovered, in both modes.

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2

## 0.1.1

### Patch Changes

- Fix the sticky header's `z-index` leaking onto the page. `:host` now sets `isolation: isolate`, so `.head`'s internal `z-index: 1` is contained within the component's own stacking context instead of competing with the consumer's page-level stacking order.
