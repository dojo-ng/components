# @dojo-ng/rich-text-image

Images for `<dj-rich-text>`, inserted from a file or a URL, with required alt text.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Inserting

- The toolbar button opens a dialog with a `dj-file-input` and a URL field. The source used most recently wins.
- Alt text is required: the Insert button stays disabled until it is filled in, because an image must have an accessible name.
- Click an image to select it; Backspace or Delete then removes it.

## Setup

- Exports `imagePlugin`, `createImagePlugin({ upload, maxSize })`, `ImageNode`, `$createImageNode`, `$isImageNode`, and `INSERT_IMAGE_COMMAND`.
- The default `upload` turns the file into a data URL, which makes the HTML value large. In production, pass your own `upload(file) => Promise<string>` that stores the file and returns its URL.
- There is no size limit by default. `maxSize` (bytes) limits the file input.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Pasting

- Paste cleaning removes `<img>` tags, so images come in through the dialog or `value`, not by pasting.

## Not built

- Resizing and cropping, captions, inserting by drag or paste, and alignment.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
