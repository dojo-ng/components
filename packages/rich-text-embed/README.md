# @dojo-ng/rich-text-embed

Embedded media for `<dj-rich-text>`: YouTube and Vimeo videos, and video or audio files, from a pasted URL.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Inserting

- The toolbar button opens a dialog for a media URL. An unsupported link shows an error and the dialog stays open.
- Matchers are tried in order. YouTube (watch, `youtu.be`, shorts, and embed URLs) and Vimeo become privacy-enhanced iframes (`youtube-nocookie.com`, `player.vimeo.com`).
- A video file (`.mp4`, `.webm`, `.m3u8`, `.mov`) uses `dj-video`, and an audio file (`.mp3`, `.m4a`, `.ogg`, `.wav`, `.flac`) uses `dj-audio`.
- `dj-video` needs the video.js stylesheet and video.js loaded at the document level.

## Setup

- Exports `embedPlugin`, `createEmbedPlugin({ matchers? })`, `EmbedNode`, `$createEmbedNode`, `$isEmbedNode`, `INSERT_EMBED_COMMAND`, `defaultMatchers`, and the `EmbedMatcher` and `EmbedPayload` types.
- There is no matcher for any iframe. Whether to allow other iframes is your decision: add your own matcher with `matchers`.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold, italic, underline, undo, and redo.

## HTML and pasting

- An embed exports as `<div data-dj-embed data-src [data-title]>` around a plain `<a href>`, so a site can render it from the data attributes or show the link.
- Embeds survive the `value` round trip.
- Paste cleaning removes iframes and the embed's attributes, so a pasted embed becomes a plain link. Embeds come in through the dialog, the command, or `value`.

## Not built

- Titles and thumbnails (oEmbed), autoplay options, a matcher for any iframe, and resizing or alignment.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Examples

### Add a custom matcher

Pass `matchers` to support more hosts. A matcher is `{ kind, match(url) }` returning `{ kind, src, title? }` or undefined; `defaultMatchers` are the built-ins.

```js
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
