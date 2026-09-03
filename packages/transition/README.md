# @dojo-ng/transition

`<dj-transition>` — Runs an enter/leave effect when `show` toggles.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Runs an enter/leave effect when `show` toggles. It defines no effects itself: it reflects a `state` attribute (`entering` | `entered` | `leaving` | `left`) on the host, and the consumer's page CSS attaches the animation to `dj-transition[state="entering"]` / `dj-transition[state="leaving"]`. Enter effects must be `@keyframes` animations (enter-by-transition is not supported in v1); leave effects may be an animation or transitioned properties. The wrapper stays mounted through the leave effect, then hides via `display: none` at `state="left"`. Rapid toggling cancels the in-flight phase cleanly and fires no event for it.

> The component defines no effects itself: it reflects a `state` attribute you animate with page CSS. Enter effects must be `@keyframes` animations on `dj-transition[state="entering"]`; enter-by-transition is not supported. Leave effects may be an animation on `[state="leaving"]` or transitioned properties.

## Install

```bash
npm install @dojo-ng/transition
```

## Usage

Import the package to register the custom element, then use the tag.

Toggle `show`; the component reflects a `state` attribute that your page CSS animates. Enter must be a keyframe animation; leave may be an animation or transitioned properties. The wrapper stays mounted through the leave, then hides.

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

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `appear` | appear ↻ | `boolean` | `false` |
| `state` | state ↻ | `"entering" \| "entered" \| "leaving" \| "left"` | — |

**Slots:** default

**Events:** `dj-after-enter`, `dj-after-leave`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
