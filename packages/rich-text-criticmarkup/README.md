# @dojo-ng/rich-text-criticmarkup

Track changes for `<dj-rich-text>` in CriticMarkup, a plain-text convention for suggested edits and comments.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/rich-text-criticmarkup
```

## Usage

Compose the plugin with the default set, starting in suggestion mode: typed/deleted text is wrapped as marks instead of applied directly.

```html
<dj-rich-text id="editor" label="Draft"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { createCriticMarkupPlugin } from "@dojo-ng/rich-text-criticmarkup";
  const el = document.getElementById("editor");
  el.plugins = [...defaultPlugins, createCriticMarkupPlugin({ suggesting: true })];
  el.value = "The quick brown fox.";
</script>
```

## The five marks

- `{++inserted++}` and `{--deleted--}`.
- `{~~old~>new~~}`, a substitution. It is imported as a deletion followed by an insertion, and accepted or declined as that pair, never one half alone.
- `{>>comment<<}`, on its own or attached right after a highlight.
- `{==highlighted==}`, a note on the text. It is kept on both accept and decline.

## Suggestion mode

- Turn it on with `setSuggestionMode(editor, true)`, or start with `createCriticMarkupPlugin({ suggesting: true })`. Typed and deleted text then becomes marks instead of changing the text directly.
- Resolve one mark with `markAtSelection`, `acceptMark`, and `declineMark`, or the whole document with `acceptAllMarks` and `declineAllMarks`.
- A comment on its own stays either way. A highlight's attached comment goes with the highlight.

## Comments

- `insertComment(editor, text)` adds a comment at a collapsed caret, or highlights a selection and attaches the comment to it. `editComment` changes a comment.
- `removeComment` removes only the comment and keeps the highlight; `removeHighlight` removes both.
- A comment cannot contain `<<}` or `{>>`, because either would break the mark the next time the text is read. `isValidCommentText` checks this, and an invalid comment is refused with a message that names the problem.

## Splitting and joining paragraphs

- A paragraph split or join suggested in suggestion mode is stored as a `¶` token inside a one-line mark, not as a real line break, so it survives Markdown import.
- The `structuralEdits` option (default `"mark"`) controls this. `"annotate"` makes the edit without tracking it and leaves a comment at the boundary, `"block"` refuses the edit, and `"apply"` makes it silently.
- The `¶` token is an extension, not standard CriticMarkup: other tools show it as a literal `¶`. Call `toPortableCriticMarkup(value)` before handing a document to another tool. It splits a multi-paragraph mark into one mark per paragraph, which can leave a blank line behind on decline. Or set `structuralEdits: "annotate"` so the token is never written.
- A `¶` that the author types is written doubled (`¶¶`) so it stays a character.

## Nested marks

- A mark inside another mark is refused as its own node instead of being garbled. It is kept as literal text, and `dj-criticmarkup-refused` fires.

## Formats

- The plugin adds its own `criticmarkup` format (`format="criticmarkup"`), so it works without the Markdown plugin.
- To read CriticMarkup inside `@dojo-ng/rich-text-markdown`'s format, add `criticMarkupTransformers` to its transformer set.

## Without an editor

- The grammar functions (`parseMarks`, `accept`, `decline`, `acceptAll`, `declineAll`, `stripComments`, and the token functions) are plain string functions with no Lexical import. Use them in a build step, on a server, or in a command-line tool.
- `fixtures/conformance.json` is included, so a port to another language can run the same test cases.

## Setup

- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Examples

### Resolve CriticMarkup with no editor

The grammar is a plain string API — parse and resolve marks from a server, a build step, or a CLI, with no Lexical/DOM dependency at all.

```js
import { parseMarks, acceptAll, declineAll } from "@dojo-ng/rich-text-criticmarkup";

const draft = "The {--old--}{++new++} plan is set.";
acceptAll(draft);                        // "The new plan is set."
declineAll(draft);                       // "The old plan is set."
parseMarks(draft).map((m) => m.kind);    // ["deletion", "insertion"]
```
