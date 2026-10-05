# @dojo-ng/rich-text-criticmarkup

## 0.1.3

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/button@0.1.2
  - @dojo-ng/i18n@0.1.1
  - @dojo-ng/popup-confirmation@0.1.1
  - @dojo-ng/popup@0.1.1
  - @dojo-ng/rich-text@0.1.3
  - @dojo-ng/text-area@0.1.1

## 0.1.2

### Patch Changes

- Fix three real-browser findings from NovelMaker's Q1.7 adoption pass (2026-09-27):

  - Insertion, deletion, and highlight marks were unreadable in dark mode. Their content CSS used
    `success-100`/`danger-100`/`warning-100` backgrounds, which `theme.css` never redefines for dark
    mode, plus four bare `--dj-color-<hue>` tokens (`success`, `danger`, `primary`, `on-primary`) that
    `theme.css` never defines at all. Backgrounds now use `neutral-100`/`-200` (confirmed to invert);
    decorative accents use the numbered `-600`/`-700` shades that do exist and are redefined for dark.
  - The suggest-edits toolbar toggle had no visible pressed state — `aria-pressed` alone has no
    reactive CSS on `dj-button`. It now switches to `kind="outlined"` while active, reusing
    `dj-button`'s own existing, already-themed style.
  - The toolbar's six items, rendered as full visible text since Track T (to satisfy axe, which
    flagged icon+`aria-label`), overflowed a normal-width toolbar. They're icons again, each paired
    with a visually-hidden text label in the default slot (not a host-level `aria-label`), which
    gives the shadow `<button>` a real accessible name from its own content. A new browser test
    confirms this is axe-clean, not just visually smaller.

- A CriticMarkup mark whose content holds markdown emphasis (`{--he thought *what?* and shook--}`) now imports as a mark through the markdown format. `@lexical/markdown` runs text-format transformers before text-match ones, so the italic transformer used to split the mark apart and leave its braces as literal text that could not be accepted or rejected. New `maskInlineFormat` (with `unmaskInlineFormat` and `inlineFormatSegments`) hides `*`, `_`, and `` ` `` inside each mark before import, and the mark transformers rebuild `*`, `**`, `***`, and code formatting inside the mark node, so the round trip is byte-exact. `createMarkdownPlugin` gains a `prepareImport` option to run it: `createMarkdownPlugin({ transformers, prepareImport: maskInlineFormat })`. The CriticMarkup plugin also registers a text-node transform that turns any leftover sentinel back into its literal character.
- Fix `acceptMark`/`declineMark`/`acceptAllMarks`/`declineAllMarks` scrolling the editor to a stale
  selection instead of leaving the view where the resolved mark was. Every caller of these functions
  is a button click (this package's own toolbar accept/reject buttons included, and any host
  application's own drawer or panel), never a caret move, so the browser's native selection has
  almost always drifted to wherever the mouse last did something selectable while Lexical's own
  internal selection is still sitting wherever the author was last actually typing — and Lexical's
  own reconciler scrolls exactly that stale position into view whenever an update leaves the editor
  root focused and the two disagree. Both resolvers now tag their `editor.update()` with Lexical's
  own `"skip-scroll-into-view"` string, alongside the existing suggestion-mode skip tag, so resolving
  a mark never moves the viewport on its own.
- Fix the suggest-edits toolbar button not visibly updating on the click that toggles it.
  `isSuggestionMode` lives in a `WeakMap` entirely outside Lexical's own editor state, so neither of
  `dj-rich-text`'s two built-in re-render triggers (an editor update, a selection change) ever fires
  from this click — the internal state flipped correctly, but `aria-pressed` and the `kind="outlined"`
  active styling stayed stale until some unrelated later action happened to re-render the toolbar.
  Fixed with `ctx.host.requestUpdate()`, the mechanism `RichTextContext.host`'s own doc comment names
  for exactly this case. New browser test asserts the DOM immediately after one click and nothing
  else, so this class of false pass (a manual check that clicked the button and then did something
  else right after) cannot recur unnoticed.
- Updated dependencies
  - @dojo-ng/rich-text@0.1.2

## 0.1.1

### Patch Changes

- Fix whitespace handling at a paragraph-break seam (decision 18). Accepting a split break now
  absorbs the surrounding horizontal whitespace into the break instead of stranding a space at each
  new block's edge; accepting a merge break now inserts a single space where the break used to be
  instead of jamming the two sides together with nothing between them. Declining either restores the
  source exactly, with no whitespace gained or lost. Fixed at both the string-grammar level and the
  live Lexical-tree level, which this package always keeps in agreement.
