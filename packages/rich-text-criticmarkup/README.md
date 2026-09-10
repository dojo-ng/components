# @dojo-ng/rich-text-criticmarkup

CriticMarkup tracked-changes plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Tracks changes in CriticMarkup, the five-mark plain-text convention: `{++inserted++}`, `{--deleted--}`, `{~~old~>new~~}` (a substitution — imported as a deletion immediately followed by an insertion, and resolved as that pair, never as a lone half), `{>>comment<<}` (bare, or anchored right after a highlight), and `{==highlighted==}` (an annotation, kept on both accept and decline). Turn suggestion mode on with `setSuggestionMode(editor, true)` (or `createCriticMarkupPlugin({ suggesting: true })`): typed/deleted text is wrapped as marks instead of applied directly. Resolve one mark with `markAtSelection`/`acceptMark`/`declineMark`, or the whole document with `acceptAllMarks`/`declineAllMarks` — a bare comment is left standing either way, and a highlight's own anchored comment goes with it, since it is state on the node, not a separate mark. A paragraph split or merge proposed in suggestion mode is carried as a token (`¶`) inside a ONE-LINE mark rather than a real newline, because `@lexical/markdown` splits the document on `\n` before any transformer runs and a mark spanning that split could never be seen on import; `structuralEdits` (plugin option, default `"mark"`) controls this — `"annotate"` lets the edit happen untracked and drops a bare comment at the boundary instead, `"block"` refuses it outright, `"apply"` allows it silently. THE PARAGRAPH TOKEN IS A DIALECT, NOT CRITICMARKUP: no other CriticMarkup tool knows it, so a document written this way shows a literal `¶` to anything else — call `toPortableCriticMarkup(value)` to convert back to plain CriticMarkup before handing it to another tool (splitting a multi-paragraph mark into one mark per block, at the cost of a blank line left behind on decline — the price of interop), or set `structuralEdits: "annotate"` so this plugin never emits the token at all. A LITERAL PILCROW AN AUTHOR TYPES IS WRITTEN DOUBLED (`¶¶`) so it round-trips as itself rather than a break. A mark nested inside another (same kind or different) is detected and refused as its own node — masked to a private-use sentinel on import, unmasked back to literal delimiter text on export, rather than mangled the way a naive regex import would mangle it — firing `dj-criticmarkup-refused`. The grammar (`parseMarks`, `accept`/`decline`/`acceptAll`/`declineAll`, `stripComments`, the token functions) is a standalone string API with no Lexical import anywhere in it, for a consumer with markdown in hand and no editor — a build step, a server, a CLI; `fixtures/conformance.json` ships in the package so a second-language port of the same grammar (this plugin's own origin: a clean-room port of NovelMaker's Python `critic.py`) can run the identical cases. Comments are authored in the editor: `insertComment(editor, text)` inserts bare at a collapsed caret or anchors `{==selection==}{>>note<<}` over a range, `editComment` changes an existing note, and the two deletes are separately labeled because they are genuinely different — `removeComment` drops just the note and leaves the highlight, `removeHighlight` drops both. A NOTE BODY CANNOT CONTAIN `<<}` OR `{>>` (either would break its own mark on the next round trip); `isValidCommentText` checks this against the same grammar the string API uses, and an invalid save is refused inline, naming the offending sequence. To recognize CriticMarkup inside `@dojo-ng/rich-text-markdown`'s own general markdown format, compose `criticMarkupTransformers` into its transformer set; this plugin also registers its own `criticmarkup` format (`format="criticmarkup"`) so tracked changes work with no markdown plugin loaded at all. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins` to keep bold/italic/underline + undo/redo.

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

## Examples

### Resolve CriticMarkup with no editor

The grammar is a plain string API — parse and resolve marks from a server, a build step, or a CLI, with no Lexical/DOM dependency at all.

```html
import { parseMarks, acceptAll, declineAll } from "@dojo-ng/rich-text-criticmarkup";

const draft = "The {--old--}{++new++} plan is set.";
acceptAll(draft);                        // "The new plan is set."
declineAll(draft);                       // "The old plan is set."
parseMarks(draft).map((m) => m.kind);    // ["deletion", "insertion"]
```
