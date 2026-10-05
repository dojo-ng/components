# @dojo-ng/video

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1

## 0.1.1

### Patch Changes

- Fix two competing-accessible-name bugs. `dj-audio`'s play button no longer carries a redundant
  `title` attribute alongside `dj-icon`'s `alt-text`, which supplied two different name sources for
  the same control. `dj-video` now sets its player-root `aria-label` on `player.el()` after video.js
  creates the player, instead of relying on a prop that video.js's own `createEl()` was clobbering
  with "Video Player"/"Audio Player" before a screen reader's rotor ever saw the component's own
  `label`.
