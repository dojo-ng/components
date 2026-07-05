# @dojo-ng/rich-text-links

Link insert/edit/remove plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins` to keep bold/italic/underline + undo/redo. The one toolbar button reflects whether the selection is a link (`aria-pressed`) and, on click, asks for a URL — an empty value removes the link, a new value sets or updates it, cancelling changes nothing. The default URL prompt is `window.prompt`; pass your own via `createLinksPlugin({ promptForUrl })` (it may be async — return a Promise) to drive it from an overlay. Auto-linking on paste/typing is a later addition.

## Install

```bash
npm install @dojo-ng/rich-text-links
```

## Usage

Compose the links plugin with the default set. `createLinksPlugin({ promptForUrl })` swaps the built-in `window.prompt` for your own (overlay) URL editor.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { linksPlugin } from "@dojo-ng/rich-text-links";
  document.getElementById("editor").plugins = [...defaultPlugins, linksPlugin];
</script>
```
