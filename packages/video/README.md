# @dojo-ng/video

`<dj-video>` — A themed video player wrapping video.js (the product's engine; v8, which bundles HLS).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A themed video player wrapping video.js (the product's engine; v8, which bundles HLS). We own integration; video.js owns playback and renders its own control bar (`controls: true` — we do NOT rebuild video controls in v1). LIGHT DOM: this component renders its player region into light DOM (`createRenderRoot()` returns `this`, the dj-rich-text precedent) because video.js injects DOM, needs its global stylesheet, and its fullscreen/track menus misbehave inside a shadow root. video.js's stylesheet is a documented APP PREREQUISITE, loaded at document level (see the README's link tag) — the same arrangement as element-internals-polyfill. Test seam: the engine is only ever created through `protected createPlayer(el, options)`, which defaults to lazily importing the real video.js factory. Tests replace it with a stub player.

> Wraps video.js (the product's engine; v8, which bundles HLS): video.js owns playback and renders its own control bar, we own integration and theming. TWO app prerequisites, both loaded at document level (the component does not bundle them): video.js's stylesheet (a `<link>` in the page head) and video.js itself (resolved by your bundler or an import map). The player region renders in LIGHT DOM by design — video.js injects its own DOM/CSS and its fullscreen and track menus misbehave inside a shadow root. `src`/`sources`/`poster` update the live player; `muted`/`autoplay`/`loop`/`tracks`/`label` recreate it. `dj-time` is throttled to at most once per second. `player()` returns the raw video.js instance (advanced escape hatch; no support implied).

## Install

```bash
npm install @dojo-ng/video
```

## Usage

Import the package to register the custom element, then use the tag.

video.js needs its stylesheet loaded at the document level (an app prerequisite, like a polyfill) and the engine resolvable as `video.js`. Pass ordered `sources` (`{ src, type }`); video.js draws its own controls. `player()` is an advanced escape hatch onto the raw video.js instance — no support implied.

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

**Events:** `dj-play`, `dj-pause`, `dj-ended`, `dj-time`

**Methods:** `play()` (Start playback.), `pause()` (Pause playback.), `player(): VideoJsPlayer | null` (The underlying video.js player instance. Advanced escape hatch; no support implied.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
