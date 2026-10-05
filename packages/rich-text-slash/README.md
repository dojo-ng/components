# @dojo-ng/rich-text-slash

A `/` command menu for `<dj-rich-text>`: type `/` to insert headings, lists, tables, images, and more.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/rich-text-slash
```

## Usage

Compose the slash plugin with the default set and the node-contributing plugins whose commands you want in the menu. Type `/` to open it; `/h` filters to headings.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { headingsPlugin } from "@dojo-ng/rich-text-headings";
  import { listsPlugin } from "@dojo-ng/rich-text-lists";
  import { imagePlugin } from "@dojo-ng/rich-text-image";
  import { slashPlugin } from "@dojo-ng/rich-text-slash";
  document.getElementById("editor").plugins = [...defaultPlugins, headingsPlugin, listsPlugin, imagePlugin, slashPlugin];
</script>
```

## Using it

- Typing `/` at the start of a block or after a space opens a menu at the caret. ArrowUp and ArrowDown move the highlight; Enter, Tab, or a click runs the item; Escape closes the menu.
- Choosing an item removes the `/query` text, then runs the item.
- A query that matches nothing hides the menu.

## What is in the menu

- The items come from every loaded plugin's `inserts`, plus any `extra` you pass. Headings adds Paragraph, Heading 1 to 3, and Quote; lists adds the three list types; image adds Image; table adds Table.
- The menu never opens when no plugin adds an item.
- To add actions from your own plugin, give it an `inserts` array (or a function `(ctx) => items`) of `{ id, label, keywords?, run(ctx) }`.

## Setup

- Exports `slashPlugin`, `createSlashPlugin({ extra? })`, `DEFAULT_SLASH_TRIGGER`, and the `aggregateInserts` and `filterInserts` helpers.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Examples

### Add a custom command

Pass `extra` items to `createSlashPlugin`. Each item is `{ id, label, keywords?, run(ctx) }`; `run` is called outside any editor update, so it can dispatch commands or open UI.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { createSlashPlugin } from "@dojo-ng/rich-text-slash";
  const slash = createSlashPlugin({
    extra: [{ id: "date", label: "Today's date", keywords: ["date", "now"], run: (ctx) => ctx.editor.update(() => {}) }],
  });
  document.getElementById("editor").plugins = [...defaultPlugins, slash];
</script>
```
