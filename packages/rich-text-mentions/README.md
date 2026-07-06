# @dojo-ng/rich-text-mentions

Mentions (@name) plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Typing the trigger (default `@`) opens a caret-anchored menu (built on `@dojo-ng/rich-text-menu`); ArrowUp/Down move the highlight, Enter/Tab or a click inserts an atomic `MentionNode` (`@label`, `segmented` mode so it deletes as a unit) plus a trailing space, Escape closes. Exports `createMentionsPlugin({ source, trigger? })`, `MentionNode`, `$createMentionNode`, `$isMentionNode`, and `DEFAULT_MENTION_TRIGGER` — there is NO default `mentionsPlugin` because `source` is app-owned and REQUIRED: `source(query) => Promise<Array<{ id, label }>>` (called debounced, with a stale-response guard and a loading spinner). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. Mentions survive the `value` round-trip via the node's own `importDOM` (`<span data-dj-mention="id">@label</span>`). PASTE CAVEAT: the sanitizer keeps `span` but strips its attributes, so a pasted mention degrades to plain `@label` text. DEFERRED: multiple trigger characters, hover-cards, in-place editing, SSR guidance.

## Install

```bash
npm install @dojo-ng/rich-text-mentions
```

## Usage

Compose the mentions plugin with the default set and supply a `source`. Here it filters a static list; in production, call your directory API.

```html
<dj-rich-text id="editor" label="Comment"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { createMentionsPlugin } from "@dojo-ng/rich-text-mentions";
  const PEOPLE = [{ id: "u1", label: "Jeff" }, { id: "u2", label: "Esther" }];
  const mentions = createMentionsPlugin({
    source: async (q) => PEOPLE.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())),
  });
  document.getElementById("editor").plugins = [...defaultPlugins, mentions];
</script>
```
