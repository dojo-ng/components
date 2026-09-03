# @dojo-ng/audio

`<dj-audio>` — A themed audio player wrapping the native `HTMLAudioElement`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A themed audio player wrapping the native `HTMLAudioElement`. The `<audio>` element is ours (hidden in the shadow root); the UI is dj- controls: a play/pause `<dj-button>` whose icon and localized label follow the media's real `play`/`pause` events (not the click, so the button stays correct if the media is driven through `media()`), a seek `<dj-slider>` whose max is set from the media duration and whose value tracks playback, and a current/total time readout. No vendor engine — audio needs none.

> Wraps the native `HTMLAudioElement` (no vendor engine — audio needs none): the `<audio>` is ours and hidden, the UI is dj- controls, so keyboard support comes free from the button and slider. Give it a `label` for an accessible name. The play/pause state follows the media's real `play`/`pause` events, not the button click, so it stays correct even if you drive playback through `media()`. `dj-time` is throttled to at most once per second; wire xAPI/analytics/resume-position as listeners on the events, not in the component. `media()` returns the raw audio element (advanced; no support implied).

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

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `src` | src | `string` | — |
| `label` | label | `string` | — |
| `preload` | preload | `string` | `"metadata"` |

**Parts:** `bar` (the control row), `play` (the play/pause button), `seek` (the slider), `time`

**Events:** `dj-play`, `dj-pause`, `dj-ended`, `dj-time`

**Methods:** `play()` (Start playback.), `pause()` (Pause playback.), `media(): HTMLAudioElement | null` (The underlying `HTMLAudioElement`. Advanced escape hatch; no support implied.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
