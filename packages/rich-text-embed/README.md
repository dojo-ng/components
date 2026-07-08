# @dojo-ng/rich-text-embed

Media embed plugin for @dojo-ng/rich-text

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes an `EmbedNode` and an `INSERT_EMBED_COMMAND`, and adds a toolbar button that opens a `dj-dialog` for pasting a media URL. The URL is run through matchers, tried in order: YouTube (watch/`youtu.be`/shorts/embed URLs) and Vimeo render as privacy-enhanced iframes (`youtube-nocookie.com`, `player.vimeo.com`); a direct video file (`.mp4/.webm/.m3u8/.mov`) renders via `dj-video` and a direct audio file (`.mp3/.m4a/.ogg/.wav/.flac`) via `dj-audio`. An unsupported link shows an inline error and keeps the dialog open. Exports `embedPlugin`, `createEmbedPlugin({ matchers? })`, `EmbedNode`, `$createEmbedNode`, `$isEmbedNode`, `INSERT_EMBED_COMMAND`, `defaultMatchers`, and the `EmbedMatcher`/`EmbedPayload` types. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. NO generic-iframe matcher ships (arbitrary iframes are a consumer decision — add your own matcher via `matchers`). APP PREREQUISITE: `dj-video` needs video.js's stylesheet + engine loaded at the document level. HTML/round-trip: an embed exports as `<div data-dj-embed data-src [data-title]>` wrapping a fallback `<a href>` (the canonical watch URL for youtube/vimeo), so a consuming site can render from the data attributes or fall back to the link; embeds survive the `value` round-trip via the node's own importDOM. PASTE: the sanitizer removes `iframe` and strips the embed div's attributes, so a pasted embed degrades to a plain link — embeds enter via the dialog, the command, or `value`. DEFERRED: oEmbed/metadata (titles, thumbnails), autoplay options, generic iframe matcher, resize/alignment UI.

## Install

```bash
npm install @dojo-ng/rich-text-embed
```

## Usage

Compose the embed plugin with the default set. Load video.js at the document level for `dj-video`. Click the embed button and paste a YouTube/Vimeo URL or a direct media file URL.

```html
<!-- App prerequisite for dj-video: load video.js's stylesheet once, in the page head. -->
<link rel="stylesheet" href="https://vjs.zencdn.net/8.10.0/video-js.css" />

<dj-rich-text id="editor" label="Article"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  import { defaultPlugins } from "@dojo-ng/rich-text";
  import { embedPlugin } from "@dojo-ng/rich-text-embed";
  document.getElementById("editor").plugins = [...defaultPlugins, embedPlugin];
</script>
```

## Examples

### Add a custom matcher

Pass `matchers` to support more hosts. A matcher is `{ kind, match(url) }` returning `{ kind, src, title? }` or undefined; `defaultMatchers` are the built-ins.

```html
import { createEmbedPlugin, defaultMatchers } from "@dojo-ng/rich-text-embed";

const loom = {
  kind: "loom",
  match: (url) => {
    const m = /loom\.com\/share\/(\w+)/.exec(url);
    return m ? { kind: "video", src: url } : undefined;
  },
};
const embed = createEmbedPlugin({ matchers: [loom, ...defaultMatchers] });
```
