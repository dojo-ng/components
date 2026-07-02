# @dojo-ng/rich-text-headings

Headings plugin for [`@dojo-ng/rich-text`](../rich-text). Adds a block-type select to the toolbar that converts the current block to a paragraph, Heading 1–3, or quote, and registers the heading and quote node classes the editor needs to render them.

```js
import { defaultPlugins } from "@dojo-ng/rich-text";
import { headingsPlugin } from "@dojo-ng/rich-text-headings";

const editor = document.querySelector("dj-rich-text");
editor.plugins = [headingsPlugin, ...defaultPlugins];
```

The plugin set replaces the default set, so spread `defaultPlugins` to keep bold/italic/underline and undo/redo alongside headings.
