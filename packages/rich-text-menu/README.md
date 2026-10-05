# @dojo-ng/rich-text-menu

The caret menu that the mentions and slash-command plugins are built on. It is not a plugin you load directly.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/rich-text-menu
```

## Usage

Inside a plugin's `setup(ctx)`, create a menu from a trigger config and drive it with `setOptions`. See `@dojo-ng/rich-text-mentions` for a complete plugin built on this.

```js
import { createEditorMenu } from "@dojo-ng/rich-text-menu";

export const myPlugin = {
  name: "at-menu",
  setup(ctx) {
    const menu = createEditorMenu(ctx, {
      match: (text) => { const m = /(^|\s)@(\w*)$/.exec(text); return m ? { start: m.index + m[1].length, query: m[2] } : null; },
      onQueryChange: async (q) => menu.setOptions((await fetchPeople(q)).map((p) => ({ value: p.id, label: p.name }))),
      onPick: (opt) => ctx.editor.update(() => { /* insert something for opt */ }),
    });
    return () => menu.dispose();
  },
};
```

## What it does

- It shows a `dj-popup` and a `dj-list` at the caret, with arrow, Enter, Tab, and Escape navigation, a polite live region, and closing on a click outside, Escape, or blur.

## Using it

Call `createEditorMenu(ctx, config)`. The `config` has three functions:

- `match(textBeforeCaret)` finds the trigger and the query, and returns `{ start, query }` or `null`.
- `onQueryChange(query)` fetches or filters, then calls the menu's `setOptions(options, loading?)`.
- `onPick(option)` runs after the trigger text has been removed.

## Also exported

- The the `EditorMenuConfig` and `MenuMatch` types, and `computeMatch(textBeforeCaret, matchFn)` for testing a matcher without a browser.
