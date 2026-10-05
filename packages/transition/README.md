# @dojo-ng/transition

`<dj-transition>` — Runs an enter or leave effect when `show` changes.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The component defines no effects itself. It sets a `state` attribute on the host, and your page CSS attaches the animation to it.

## Install

```bash
npm install @dojo-ng/transition
```

## Usage

Import the package to register the custom element, then use the tag.

Toggle `show`; page CSS animates the `state` attribute.

```html
<style>
  dj-transition[state="entering"] { animation: fade-in 200ms both; }
  dj-transition[state="leaving"]  { animation: fade-out 200ms both; }
  @keyframes fade-in  { from { opacity: 0; transform: translateY(4px); } }
  @keyframes fade-out { to   { opacity: 0; } }
</style>
<button id="toggle">Toggle</button>
<dj-transition id="panel" show>
  <section>Now you see me.</section>
</dj-transition>
<script type="module">
  import "@dojo-ng/transition";
  const panel = document.getElementById("panel");
  document.getElementById("toggle").addEventListener("click", () => (panel.show = !panel.show));
  panel.addEventListener("dj-after-leave", () => console.log("left"));
</script>
```

## States

- `state` moves through `entering`, `entered`, `leaving`, and `left`.
- Attach the enter effect to `dj-transition[state="entering"]` and the leave effect to `dj-transition[state="leaving"]`.
- The content stays visible through the leave effect, then is hidden with `display: none` at `state="left"`.

## Effects

- An enter effect must be a `@keyframes` animation.
- A leave effect can be an animation or a CSS transition.
- If `show` changes again during an effect, that effect stops cleanly and its event does not fire.

## Not built

- Enter effects made with CSS transitions.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `appear` | appear ↻ | `boolean` | `false` |
| `state` | state ↻ | `"entering" \| "entered" \| "leaving" \| "left"` | — |

## Slots

- default slot

## Events

- `dj-after-enter`
- `dj-after-leave`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
