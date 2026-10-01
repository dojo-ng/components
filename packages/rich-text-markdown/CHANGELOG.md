# @dojo-ng/rich-text-markdown

## 0.2.0

### Minor Changes

- A CriticMarkup mark whose content holds markdown emphasis (`{--he thought *what?* and shook--}`) now imports as a mark through the markdown format. `@lexical/markdown` runs text-format transformers before text-match ones, so the italic transformer used to split the mark apart and leave its braces as literal text that could not be accepted or rejected. New `maskInlineFormat` (with `unmaskInlineFormat` and `inlineFormatSegments`) hides `*`, `_`, and `` ` `` inside each mark before import, and the mark transformers rebuild `*`, `**`, `***`, and code formatting inside the mark node, so the round trip is byte-exact. `createMarkdownPlugin` gains a `prepareImport` option to run it: `createMarkdownPlugin({ transformers, prepareImport: maskInlineFormat })`. The CriticMarkup plugin also registers a text-node transform that turns any leftover sentinel back into its literal character.

### Patch Changes

- Updated dependencies
  - @dojo-ng/rich-text@0.1.2
