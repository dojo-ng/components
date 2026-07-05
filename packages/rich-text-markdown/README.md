# @dojo-ng/rich-text-markdown

Markdown input/output plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes no nodes and no toolbar: it adds a `markdown` output format (set `format="markdown"` on `dj-rich-text` and the `value` getter emits Markdown, the setter parses it) and, by default, registers type-a-shortcut behaviour (`# ` for a heading, `- ` for a list, `**bold**`, and so on) even when the output format stays HTML. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins` to keep bold/italic/underline + undo/redo. Markdown coverage follows the node-contributing plugins that are loaded: transformers whose node classes are not registered are dropped, so pair this with `rich-text-headings`, `rich-text-lists`, and `rich-text-links` for headings, lists, and links. Without the headings plugin, `# ` stays literal text. `createMarkdownPlugin({ shortcuts, transformers })` turns shortcuts off or supplies a custom transformer set; `usableTransformers(editor, transformers)` is exported for inspection. Requires the `@lexical/markdown` dependency. Note: pasted Markdown-looking text is not converted; Markdown enters via the `value` property or the shortcuts.

## Install

```bash
npm install @dojo-ng/rich-text-markdown
```

## Usage

Compose the markdown plugin with the default set (plus headings/lists/links for full coverage) and set `format="markdown"` so the value round-trips as Markdown. Typing `# ` still makes a heading.

```html
<dj-rich-text id="editor" label="Article" format="markdown"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { headingsPlugin } from "@dojo-ng/rich-text-headings";
  import { listsPlugin } from "@dojo-ng/rich-text-lists";
  import { linksPlugin } from "@dojo-ng/rich-text-links";
  import { markdownPlugin } from "@dojo-ng/rich-text-markdown";
  const el = document.getElementById("editor");
  el.plugins = [...defaultPlugins, headingsPlugin, listsPlugin, linksPlugin, markdownPlugin];
  el.value = "# Title\n\nSome **bold** text.";
</script>
```
