# @dojo-ng/rich-text-autolink

Automatic links for `<dj-rich-text>`: URLs and email addresses become links as you type.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## How it works

- A text transform finds URLs and email addresses as you type and wraps them in links.
- Editing the text so it no longer matches removes the link; editing it to a different URL updates the address. Links you made by hand are never changed.
- `www.` addresses get `https://`, and plain email addresses get `mailto:`.

## Setup

- Exports `autolinkPlugin`, `createAutoLinkPlugin({ matchers? })`, and `defaultMatchers`.
- A matcher is `{ regex, url(matched) }`. The regex must not be global, and the earliest match wins.
- It also registers the link node, so exported `<a>` elements import again through `value` even without `rich-text-links`. Loading both is fine.
- Pair it with `rich-text-links` for editing links by hand.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## Not built

- URLs split across formatting, removing an automatic link from a toolbar, and opening a link by clicking it in the editor.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).
