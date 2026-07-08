# @dojo-ng/rich-text-emoji

Emoji picker + shortcode plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element; contributes NO nodes — emoji are plain text). Adds a toolbar button opening a searchable 8-column emoji picker (filter by name/shortcode/keyword, arrow-key roving, click or Enter to insert); the popup stays open for multi-insert and closes on Escape/outside click, returning focus to the editor. With `shortcodes` on (default), typing a GitHub-style `:name:` for a known shortcode replaces it with the character; unknown shortcodes are left literal. Exports `emojiPlugin`, `createEmojiPlugin({ shortcodes?, set? })`, `EMOJI` (~170 curated single-grapheme entries across smileys, people, hearts, animals, food, activities, objects, symbols), the pure `filterEmoji(set, query)` helper, and the `EmojiEntry` type. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. Note: the native OS emoji picker (macOS Ctrl-Cmd-Space, Windows Win-.) already works in the editor — this adds a discoverable, cross-platform path, not the only one. RELATED PATTERN: to highlight hashtags or other tokens, build a node on the public plugin API the way `@dojo-ng/rich-text-mentions` builds `MentionNode` (hashtags are intentionally not shipped). DEFERRED: skin-tone variants, recently-used, category headers, a `:shortcode:` typeahead menu, custom image sets.

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
