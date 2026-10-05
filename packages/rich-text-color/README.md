# @dojo-ng/rich-text-color

Text color and highlight color for `<dj-rich-text>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/rich-text-color
```

## Usage

Compose the color plugins with the default set. `createColorPlugin` customizes the style property, label, or swatches.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { colorPlugin, backgroundColorPlugin } from "@dojo-ng/rich-text-color";
  document.getElementById("editor").plugins = [...defaultPlugins, colorPlugin, backgroundColorPlugin];
</script>
```

## Setup

- Exports `colorPlugin` (text color), `backgroundColorPlugin`, and `createColorPlugin({ styleProperty, label, swatches })`.
- Color is an inline style on the text, so the plugin adds no node types.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Using it

- The toolbar button shows the current color as a swatch. Clicking it opens a `dj-color-picker` and a Remove color button.
- The picker applies the color live while you drag, without moving focus.
- The popup closes on a click outside or on Escape, and focus returns to the editor.

## Pasting

- The default paste cleaning removes inline styles, so pasted colored text loses its color.
- Color is kept through `value`, which is not cleaned. A trusted app can set its own `pasteSanitizer`.
