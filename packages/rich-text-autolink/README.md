# @dojo-ng/rich-text-autolink

Auto-link (URL/email) plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element, no toolbar, no CSS). A `TextNode` transform detects URLs and emails as you type and wraps them in `AutoLinkNode`s; editing the text so it no longer matches unwraps the link, and editing it to a different URL updates the href. It contributes `AutoLinkNode` AND `LinkNode` so the exported `<a>` re-imports on the `value` path even without the links plugin (loading both `rich-text-links` and this is harmless — the core de-duplicates node classes). Manual links are never touched. Exports `autolinkPlugin`, `createAutoLinkPlugin({ matchers? })`, `defaultMatchers`, and the `AutoLinkMatcher = { regex, url(matched) }` type (regex is NON-global; earliest match wins; `www.` URLs get `https://`, bare emails get `mailto:`). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. Pair it with `rich-text-links` for manual link editing. OUT OF SCOPE (v1): URLs split across formatting boundaries, un-autolinking via a toolbar, click-to-open in the editor.

## Install

```bash
npm install @dojo-ng/rich-text-autolink
```

## Usage

Compose the autolink plugin with the default set; typing a URL or email followed by a space (or any boundary) links it. Add the links plugin too for manual link editing.

```html
<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { autolinkPlugin } from "@dojo-ng/rich-text-autolink";
  document.getElementById("editor").plugins = [...defaultPlugins, autolinkPlugin];
</script>
```
