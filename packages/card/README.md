# @dojo-ng/card

`<dj-card>` — Content container.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Slots: `header`, default (content), `actions`. Optional `title`/`subtitle`/`media-src`. `clickable` makes the body a button. Parts: `root`, `media`, `body`, `actions`.

## Install

```bash
npm install @dojo-ng/card
```

## Usage

Import the package to register the custom element, then use the tag.

Title, body, and an actions slot.

```html
<dj-card title="Mont Blanc" subtitle="4,808 m">
  The highest mountain in the Alps.
  <div slot="actions">
    <dj-button kind="text">Details</dj-button>
  </div>
</dj-card>
```

## Navigation

- Set `path` to make the card a link to an app path. The body becomes a real `<a href>`, so Ctrl/Cmd-click, middle-click, and "open in new tab" work, and a screen reader announces a link. Keep buttons and other controls out of the default slot of such a card, because they would sit inside a link; put them in the `actions` slot, which is outside it.
- A plain click is turned into `dj-navigate` (detail `{ path, label }`, `label` being the title), which `@dojo-ng/history` turns into a navigation. A click with a modifier key, or one that is already prevented, is left to the browser. With no history installed, the link navigates normally, as a full page load.
- The `href` is the path with the history `base` added, so it stays correct under a prefix.
- `path` wins over `clickable`: with both set, the body is the link and not a button.
- Set `track` to follow the location: the link gets `aria-current="page"` while the location is this card's `path`. The package is only read when history is installed.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `kind` | kind ↻ | `"elevated" \| "outlined"` | `"elevated"` |
| `square` | square | `boolean` | `false` |
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `mediaSrc` | media-src | `string` | — |
| `mediaTitle` | media-title | `string` | — |
| `clickable` | clickable | `boolean` | `false` |
| `path` | path | `string` | — |
| `track` | track | `boolean` | `false` |

## Slots

- `header`
- default slot: Content.
- `actions`

## CSS parts

- `root`
- `media`
- `body`
- `actions`

## Events

- `dj-navigate`: Detail `{ path, label }`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
