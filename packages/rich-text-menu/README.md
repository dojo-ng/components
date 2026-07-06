# @dojo-ng/rich-text-menu

Caret-anchored menu machinery for @dojo-ng/rich-text plugins

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Internal plumbing for `@dojo-ng/rich-text` caret-anchored menus (used by the mentions and slash-command plugins) — not a custom element and not a plugin you load directly. Exports `createEditorMenu(ctx, config)` plus the `EditorMenuConfig`/`MenuMatch` types and the pure `computeMatch(textBeforeCaret, matchFn)` helper. You give it a `config` with `match(textBeforeCaret) => { start, query } | null` (locate the trigger + query in the caret's text), `onQueryChange(query)` (fetch/filter, then call the returned menu's `setOptions(options, loading?)`), and `onPick(option)` (called AFTER the trigger text has been removed). The menu owns a `dj-popup` + `dj-list` positioned at the caret, arrow/Enter/Tab/Escape navigation, a polite live region, and light-dismiss (outside click, Escape, or blur). Positioning and the interactive feel are browser-verified; the matcher is unit-testable via `computeMatch`.

## Install

```bash
npm install @dojo-ng/rich-text-menu
```

## Usage

Inside a plugin's `setup(ctx)`, create a menu from a trigger config and drive it with `setOptions`. See `@dojo-ng/rich-text-mentions` for a complete plugin built on this.

```html
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
