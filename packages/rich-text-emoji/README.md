# @dojo-ng/rich-text-emoji

An emoji picker and `:shortcode:` replacement for `<dj-rich-text>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/rich-text-emoji
```

## Usage

Compose the emoji plugin with the default set. The toolbar gains an emoji button; typing `:tada:` becomes 🎉.

```html
<dj-rich-text id="editor" label="Comment"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { emojiPlugin } from "@dojo-ng/rich-text-emoji";
  document.getElementById("editor").plugins = [...defaultPlugins, emojiPlugin];
</script>
```

## Picker

- The toolbar button opens a searchable emoji picker, eight columns wide. Search by name, shortcode, or keyword; move with the arrow keys; insert with a click or Enter.
- The picker stays open so you can insert several, and closes on Escape or a click outside. Focus returns to the editor.
- The system emoji picker (Ctrl+Cmd+Space on macOS, Win+. on Windows) also works in the editor. This adds a visible picker that works the same on every platform.

## Shortcodes

- With `shortcodes` on (the default), typing a GitHub-style `:name:` replaces it with the emoji. Unknown shortcodes stay as typed.

## Setup

- Exports `emojiPlugin`, `createEmojiPlugin({ shortcodes?, set? })`, `EMOJI` (about 170 emoji across smileys, people, hearts, animals, food, activities, objects, and symbols), the `filterEmoji(set, query)` helper, and the `EmojiEntry` type.
- Emoji are plain text, so the plugin adds no node types.
- For hashtags or other highlighted tokens, build a node the way `@dojo-ng/rich-text-mentions` builds its mention node. Hashtags are not included on purpose.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Not built

- Skin-tone variants, recently used emoji, category headings, a `:shortcode:` suggestion menu, and custom image sets.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
