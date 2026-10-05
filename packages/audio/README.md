# @dojo-ng/audio

`<dj-audio>` — A themed audio player.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

It wraps the native `HTMLAudioElement`, hidden in the shadow root, with Dojo NG controls: a play/pause button, a seek slider, and a readout of the current and total time. It needs no third-party player.

## Install

```bash
npm install @dojo-ng/audio
```

## Usage

Import the package to register the custom element, then use the tag.

Set `src` and a `label`. The play/pause button, seek slider, and time readout are dj- controls; keyboard works out of the box. Listen for `dj-play`/`dj-pause`/`dj-ended` and the throttled `dj-time` `{ current, duration }`.

```html
<dj-audio src="/media/episode-1.mp3" label="Episode 1"></dj-audio>
<script type="module">
  import "@dojo-ng/audio";
  const a = document.querySelector("dj-audio");
  a.addEventListener("dj-time", (e) => console.log(e.detail.current, "/", e.detail.duration));
</script>
```

## Accessibility

- Give the player a `label`. It becomes the accessible name.
- Keyboard support comes from the button and the slider.

## Playback state

- The play/pause button follows the media's real `play` and `pause` events, not the click. It stays correct when you control playback through `media()`.
- The seek slider's maximum comes from the media duration, and its value follows playback.

## Events and analytics

- `dj-time` fires at most once per second.
- Put analytics, xAPI statements, and saved resume positions in your own event listeners, not in the component.
- `media()` returns the raw audio element for advanced use. Code that uses it is not supported.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `src` | src | `string` | — |
| `label` | label | `string` | — |
| `preload` | preload | `string` | `"metadata"` |

## CSS parts

- `bar`: The control row.
- `play`: The play/pause button.
- `seek`: The slider.
- `time`

## Events

- `dj-play`
- `dj-pause`
- `dj-ended`
- `dj-time`

## Methods

- `play()`: Start playback.
- `pause()`: Pause playback.
- `media(): HTMLAudioElement | null`: The underlying `HTMLAudioElement`. Advanced escape hatch; no support implied.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
