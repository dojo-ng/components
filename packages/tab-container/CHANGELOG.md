# @dojo-ng/tab-container

## 0.1.2

### Patch Changes

- `dj-tab-container` keyboard and ARIA fixes (CB28). Arrow keys, Home and End skip disabled tabs instead of stopping on them. An `active-index` that points at no tab or a disabled one still leaves one tab in the Tab order. Delete closes a closeable tab (advertised with `aria-keyshortcuts`); Escape no longer does. The close icon is pointer-only, so no `role="button"` sits inside a tab. Each panel is labelled with its tab's name unless the page labelled it, tabs point at their panels with `ariaControlsElements` where supported, and an inactive panel stays hidden even when page CSS gives panels a `display`.
- Updated dependencies
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.5

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/icon@0.1.1
