# @dojo-ng/rich-text-lists

Bulleted, numbered, and check lists for `<dj-rich-text>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/rich-text-lists
```

## Usage

Compose the lists plugin with the default set; the toolbar gains bulleted, numbered, and checklist toggles. Click a checkbox (or press Space at the start of an item) to toggle it.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { listsPlugin } from "@dojo-ng/rich-text-lists";
  document.getElementById("editor").plugins = [...defaultPlugins, listsPlugin];
</script>
```

## Using it

- Three toolbar buttons turn the current block into a bulleted, numbered, or check list, or back.

## Check lists

- Each check item's state is on its `<li>` as `data-dj-checked="true|false"`, with `role="checkbox"` and `aria-checked`, so you can style it with CSS.
- A click in the marker area at the start of the item (the left edge, or the right edge in a right-to-left page) toggles it. A click on the text only places the caret.
- Space at the start of an item also toggles it.
- The checked state survives the `value` round trip in the HTML that Lexical exports, so a site can style the exported `data-dj-checked` and `aria-checked` attributes.

## Setup

- Exports `listsPlugin`. With `rich-text-slash` loaded, the slash menu also offers the three list types.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Not built

- Extra indent styling for nested check lists, and clickable checkboxes outside the editor.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
