# @dojo-ng/rich-text-lists

List plugin for [`@dojo-ng/rich-text`](../rich-text). Adds bulleted and numbered list buttons to the toolbar, registers the list node classes, and installs Lexical's list behavior. Each button toggles the selection in and out of its list type.

```js
import { defaultPlugins } from "@dojo-ng/rich-text";
import { listsPlugin } from "@dojo-ng/rich-text-lists";

const editor = document.querySelector("dj-rich-text");
editor.plugins = [listsPlugin, ...defaultPlugins];
```

The plugin set replaces the default set, so spread `defaultPlugins` to keep bold/italic/underline and undo/redo alongside lists.
