# @dojo-ng/rich-text-lists

Bulleted/numbered/checklist plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes the `ListNode`/`ListItemNode` classes, installs Lexical's list behaviour, and adds three toolbar buttons that toggle the current block into and out of a bulleted, numbered, or check list. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. Exports `listsPlugin`. CHECKLISTS: the installed `@lexical/list` does not export `registerCheckList`, so the plugin owns the interaction — it registers `INSERT_CHECK_LIST_COMMAND` (via `insertList(editor, "check")`), reflects each check item's state onto its `<li>` as `data-dj-checked="true|false"` plus `role="checkbox"` and `aria-checked` (theme-independent, keyed by CSS), toggles on a click in the ~1.6em marker zone (LTR left edge, RTL right edge — clicking the text just places the caret), and toggles on Space at the start of an item. Checked state round-trips through the `value` HTML on Lexical 0.21's native list export/import (the emitted markup is `<ul __lexicallisttype="check"><li role="checkbox" aria-checked="true|false">…</li></ul>`), so no serialization overrides are needed; consuming sites can style the exported `data-dj-checked`/`aria-checked` attributes themselves. DEFERRED: nested-checklist indent styling beyond what lists already do, and read-only interactive checkboxes outside the editor.

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
