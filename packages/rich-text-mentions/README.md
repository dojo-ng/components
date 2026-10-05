# @dojo-ng/rich-text-mentions

@mentions for `<dj-rich-text>`: type `@` and pick a person from a menu.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Using it

- Typing the trigger (`@` by default) opens a menu at the caret. ArrowUp and ArrowDown move the highlight; Enter, Tab, or a click inserts the mention and a space; Escape closes the menu.
- A mention is one unit: it shows as `@label` and Backspace deletes it whole.

## Setup

- `source` is required and comes from your app: `source(query) => Promise<Array<{ id, label }>>`. It is called after a short delay, older answers are ignored, and a spinner shows while it loads.
- Because `source` is required, there is no ready-made `mentionsPlugin`. Use `createMentionsPlugin({ source, trigger? })`.
- Also exports `MentionNode`, `$createMentionNode`, `$isMentionNode`, and `DEFAULT_MENTION_TRIGGER`.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## HTML and pasting

- Mentions survive the `value` round trip as `<span data-dj-mention="id">@label</span>`.
- Paste cleaning keeps the `span` but removes its attributes, so a pasted mention becomes plain `@label` text.

## Not built

- More than one trigger character, hover cards, editing a mention in place, and guidance for server-side rendering.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
