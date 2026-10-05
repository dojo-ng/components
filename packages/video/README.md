# @dojo-ng/video

`<dj-video>` — A themed video player built on video.js.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Video.js (version 8, which includes HLS support) plays the video and draws its own control bar. The component handles setup, theming, and events.

## Install

```bash
npm install @dojo-ng/video
```

## Usage

Import the package to register the custom element, then use the tag.

Ordered `sources` (`{ src, type }`); video.js draws its own controls. Load the video.js stylesheet first.

```html
<!-- App prerequisite: load video.js's stylesheet once, in the page head. -->
<link rel="stylesheet" href="https://vjs.zencdn.net/8.10.0/video-js.css" />

<dj-video
  label="Intro"
  poster="/media/intro-poster.jpg"
  .sources=${[{ src: "/media/intro.m3u8", type: "application/x-mpegURL" }]}
></dj-video>
<script type="module">
  import "@dojo-ng/video";
  const v = document.querySelector("dj-video");
  v.addEventListener("dj-play", () => console.log("playing"));
  // Advanced, no support implied:
  // v.player().requestFullscreen();
</script>
```

## Before you use it

Load two things at the document level, because the component does not bundle them:

- The video.js stylesheet, with a `<link>` in the page head.
- video.js itself, resolved by your bundler or an import map.

## Changing properties

- `src`, `sources`, and `poster` update the playing video.
- `muted`, `autoplay`, `loop`, `tracks`, and `label` recreate the player.

## Events and methods

- `dj-play`, `dj-pause`, and `dj-ended` follow playback. `dj-time` reports `{ current, duration }` at most once per second.
- Use these events for analytics, xAPI statements, or saving the playback position.
- `play()` and `pause()` control playback. `player()` returns the video.js instance itself, for advanced use; the component does not support what you do with it.

## Light DOM

- The player renders in the light DOM, because video.js adds its own DOM and styles, and its fullscreen and track menus do not work well inside a shadow root.

## Not built

- Custom video controls. The video.js control bar is used as it is.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `sources` | — | `VideoJsSource[]` | — |
| `src` | src | `string` | — |
| `poster` | poster | `string` | — |
| `muted` | muted | `boolean` | `false` |
| `autoplay` | autoplay | `boolean` | `false` |
| `loop` | loop | `boolean` | `false` |
| `tracks` | — | `unknown[]` | — |
| `label` | label | `string` | — |

## Events

- `dj-play`
- `dj-pause`
- `dj-ended`
- `dj-time`

## Methods

- `play()`: Start playback.
- `pause()`: Pause playback.
- `player(): VideoJsPlayer | null`: The underlying video.js player instance. Advanced escape hatch; no support implied.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
