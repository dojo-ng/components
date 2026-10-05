# @dojo-ng/rich-text-links

Links for `<dj-rich-text>`: add, change, and remove a link on the selection.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Using it

- The toolbar button shows whether the selection is a link (`aria-pressed`). Clicking it asks for a URL.
- An empty URL removes the link, a new URL sets or changes it, and Cancel changes nothing.

## Setup

- The default prompt is `window.prompt`. Pass your own with `createLinksPlugin({ promptForUrl })`; it may return a Promise, so it can open your own dialog.
- For links made automatically while typing, add `rich-text-autolink`.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.
