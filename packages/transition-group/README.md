# @dojo-ng/transition-group

`<dj-transition-group>` — Coordinates slotted `dj-transition` children, staggering their `show` toggles.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Coordinates slotted `dj-transition` children, staggering their `show` toggles. When the group's `show` changes it drives each child's `show` in DOM order, child `i` after `i * stagger` ms, for both enter and leave. When every child has completed its phase it emits one group `dj-after-enter` (or `dj-after-leave`). v1 is stagger only: no FLIP/list-move animation and no `appear` forwarding (set `appear` on the children directly). Non-`dj-transition` slotted elements are ignored.

> Coordinates slotted `dj-transition` children only (v1 is stagger, no list-move animation). The effects live on the children; the group just drives their `show` with a delay. Set `appear` on the children directly.

## Install

```bash
npm install @dojo-ng/transition-group
```

## Usage

Import the package to register the custom element, then use the tag.

Wrap each item in a `dj-transition` and let the group drive them with a delay. The effect lives on the children; the group emits one `dj-after-enter` when all have finished.

```html
<style>
  dj-transition[state="entering"] { animation: fade-in 200ms both; }
  @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } }
</style>
<button id="reveal">Reveal</button>
<ul>
  <dj-transition-group id="grp" stagger="80">
    <dj-transition><li>One</li></dj-transition>
    <dj-transition><li>Two</li></dj-transition>
    <dj-transition><li>Three</li></dj-transition>
  </dj-transition-group>
</ul>
<script type="module">
  import "@dojo-ng/transition"; import "@dojo-ng/transition-group";
  const grp = document.getElementById("grp");
  document.getElementById("reveal").addEventListener("click", () => (grp.show = !grp.show));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `stagger` | stagger | `number` | `0` |

**Slots:** default

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
