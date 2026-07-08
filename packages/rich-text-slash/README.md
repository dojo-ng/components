# @dojo-ng/rich-text-slash

Slash-command menu plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Typing `/` at the start of a block or after whitespace opens a caret-anchored command menu (built on `@dojo-ng/rich-text-menu`); ArrowUp/Down move the highlight, Enter/Tab or a click runs the item, Escape closes. The menu's items are aggregated from every loaded plugin's `inserts` plus any `extra` you pass, so it reflects whatever plugins you compose: headings contribute Paragraph/Heading 1–3/Quote, lists contribute Bulleted/Numbered/Checklist, image contributes Image, table contributes Table. Picking an item removes the `/query` text, then runs the item's `run(ctx)` (convert the block, insert a table, open the image dialog, …). The menu never opens when no plugin contributes an insert, and a query that matches nothing hides it. Exports `slashPlugin`, `createSlashPlugin({ extra? })`, `DEFAULT_SLASH_TRIGGER`, and the pure `aggregateInserts`/`filterInserts` helpers. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. To expose block/insert actions from your own plugin, add an `inserts` array (or `(ctx) => items`) of `{ id, label, keywords?, run(ctx) }`.

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
