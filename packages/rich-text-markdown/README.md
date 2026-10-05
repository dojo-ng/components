# @dojo-ng/rich-text-markdown

Markdown for `<dj-rich-text>`: a Markdown value format and typing shortcuts.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Markdown value

- Set `format="markdown"` on `dj-rich-text`: `value` then returns Markdown, and setting it parses Markdown.
- Coverage follows the plugins that add content types. Pair it with `rich-text-headings`, `rich-text-lists`, and `rich-text-links` for headings, lists, and links. Without the headings plugin, `# ` stays as typed.
- Pasted text that looks like Markdown is not converted. Markdown comes in through `value` or the shortcuts.

## Shortcuts

- By default, typing `# ` makes a heading, `- ` a list, `**bold**` bold text, and so on, even when the value format stays HTML.

## Setup

- `createMarkdownPlugin({ shortcuts, transformers })` turns the shortcuts off or sets your own transformers. `usableTransformers(editor, transformers)` shows which ones apply.
- Requires the `@lexical/markdown` package.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.
