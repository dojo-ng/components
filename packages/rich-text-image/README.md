# @dojo-ng/rich-text-image

Image insert plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes an `ImageNode` (a decorator node rendering an `<img>`) plus an `INSERT_IMAGE_COMMAND`, and a toolbar button that opens a `dj-dialog` for inserting an image from a file (`dj-file-input`) or a URL — the most recent source wins. Alt text is REQUIRED: the insert button stays disabled until it is non-empty, because the accessible name is mandatory. Exports `imagePlugin`, `createImagePlugin({ upload })`, `ImageNode`, `$createImageNode`, `$isImageNode`, and `INSERT_IMAGE_COMMAND`. Clicking an image selects it (a NodeSelection); Backspace/Delete then removes it (handled by Lexical). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. DATA-URL CAVEAT: the default `upload` reads the file to a data URL, which bloats the HTML value — pass your own `upload(file) => Promise<string>` in production to host the file and return a URL. PASTE CAVEAT: the default paste sanitizer drops `<img>` tags, so images enter via the dialog or the `value` property, not paste. DEFERRED: resize/crop, captions, drag/paste insertion, alignment.

## Install

```bash
npm install @dojo-ng/rich-text-image
```

## Usage

Compose the image plugin with the default set. Pass `createImagePlugin({ upload })` to host files instead of embedding data URLs.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { createImagePlugin } from "@dojo-ng/rich-text-image";
  const imagePlugin = createImagePlugin({ upload: async (file) => (await myUploader(file)).url });
  document.getElementById("editor").plugins = [...defaultPlugins, imagePlugin];
</script>
```
