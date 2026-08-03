# @dojo-ng/rich-text-headings

Headings/quote plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Contributes the `HeadingNode`/`QuoteNode` classes and one toolbar control: a paragraph-style `<select>` that shows the current block's type (Paragraph, Heading 1–3, Quote) and converts the selection's block(s) to the chosen type on change, returning focus to the editor afterward. FOUNDATIONAL, not optional in practice: Lexical needs node classes registered at editor creation, so without this plugin loaded, headings and quotes cannot exist in the document by any path — pasted or `value`-set `<h1>`–`<h3>`/`<blockquote>` markup degrades to plain paragraphs on import (the same rule `rich-text-table` documents for tables), `rich-text-markdown`'s `# `/`> ` shortcuts have nothing to convert into, and `rich-text-slash`'s Heading/Quote menu items silently do nothing. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins` to keep bold/italic/underline + undo/redo. Exports `headingsPlugin` as a ready-made instance — unlike most rich-text plugins there is no `createHeadingsPlugin`/options, since there is nothing to configure. Also contributes five slash-menu inserts (Paragraph, Heading 1–3, Quote), picked up automatically when `rich-text-slash` is loaded alongside it.

## Install

```bash
npm install @dojo-ng/rich-text-headings
```

## Usage

Compose the headings plugin with the default set; the toolbar gains a paragraph-style select. Choosing Heading 1–3 or Quote converts the current block(s); choosing Paragraph converts back.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { headingsPlugin } from "@dojo-ng/rich-text-headings";
  document.getElementById("editor").plugins = [...defaultPlugins, headingsPlugin];
</script>
```
