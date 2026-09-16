# @dojo-ng/audio

## 0.1.1

### Patch Changes

- Fix two competing-accessible-name bugs. `dj-audio`'s play button no longer carries a redundant
  `title` attribute alongside `dj-icon`'s `alt-text`, which supplied two different name sources for
  the same control. `dj-video` now sets its player-root `aria-label` on `player.el()` after video.js
  creates the player, instead of relying on a prop that video.js's own `createEl()` was clobbering
  with "Video Player"/"Audio Player" before a screen reader's rotor ever saw the component's own
  `label`.
