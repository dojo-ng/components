# @dojo-ng/rich-text-emoji

## 0.1.2

### Patch Changes

- Make table header cells and the emoji grid hover follow the theme in dark mode. Both used `--dj-color-background-alt`, which no theme defines, so the light fallback always applied. They now use `--dj-color-neutral-100`, and header cells also set their text color from `--dj-color-text`. When a `value` is set back into the editor, the table plugin also drops the light fill that Lexical writes inline on header cells. HTML exported from the editor still carries that fill, so email and other HTML readers are unchanged.
- Updated dependencies
  - @dojo-ng/rich-text@0.1.5

## 0.1.1

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/button@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/popup@0.1.1
  - @dojo-ng/rich-text@0.1.3
  - @dojo-ng/text-input@0.1.1
