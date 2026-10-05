# @dojo-ng/rich-text-headings

Headings (levels 1 to 3) and block quotes for `<dj-rich-text>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Using it

- The toolbar gets a paragraph-style menu that shows the current block's type (Paragraph, Heading 1 to 3, or Quote) and changes the selected blocks to the chosen type. Focus returns to the editor.
- With `rich-text-slash` loaded, the slash menu also offers Paragraph, Heading 1 to 3, and Quote.

## Why you need it

Lexical needs its node types when the editor is created. Without this plugin, headings and quotes cannot exist in the document at all:

- Pasted or `value`-set `<h1>` to `<h3>` and `<blockquote>` become plain paragraphs.
- `rich-text-markdown`'s `# ` and `> ` shortcuts have nothing to convert into.
- `rich-text-slash`'s Heading and Quote items do nothing.

## Setup

- Exports `headingsPlugin`, ready to use. There is no `createHeadingsPlugin`, because there is nothing to configure.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.
