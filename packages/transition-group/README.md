# @dojo-ng/transition-group

`<dj-transition-group>` — Staggers the `show` of its `dj-transition` children.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The effects live on the children. The group only sets each child's `show`, with a delay.

## Install

```bash
npm install @dojo-ng/transition-group
```

## Usage

Import the package to register the custom element, then use the tag.

Wrap each item in a `dj-transition`. The group shows them one after another and emits one `dj-after-enter` when all have finished.

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

## How it works

- When the group's `show` changes, it sets each child's `show` in DOM order. Child `i` starts after `i * stagger` milliseconds, for both enter and leave.
- When every child has finished, the group emits one `dj-after-enter` or `dj-after-leave`.
- Slotted elements that are not `dj-transition` are ignored.

## Not built

- List-move (FLIP) animation.
- Forwarding `appear` to the children. Set `appear` on each child instead.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `stagger` | stagger | `number` | `0` |

## Slots

- default slot

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
