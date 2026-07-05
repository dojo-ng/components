# @dojo-ng/rich-text-color

Text/background color plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Color is an inline `TextNode` style, so it contributes no nodes: it patches `color` (or `background-color`) on the selection via `$patchStyleText`. Exports `colorPlugin` (text color), `backgroundColorPlugin`, and `createColorPlugin({ styleProperty, label, swatches })`. The toolbar control is a `dj-button` whose icon is a swatch chip of the selection's current color; clicking it opens a `dj-popup` with a `dj-color-picker` and a Remove color button. The picker applies live (a preview during a drag) without stealing focus; the popup light-dismisses (outside click / Escape) and focus returns to the editor. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. PASTE CAVEAT: the default paste sanitizer strips inline `style`, so pasted colored text loses its color — color round-trips through the `value` property (which does not pass the paste sanitizer); a trusted app can supply its own `pasteSanitizer`.

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
