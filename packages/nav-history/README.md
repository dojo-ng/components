# @dojo-ng/nav-history

`<dj-back-button>` — A Back button that follows the app's navigation history.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

It is built on `<dj-button>`, so keyboard use, focus, and button semantics come from there. Install `@dojo-ng/history` once at startup; the button finds it through `HistoryController`.

The components that go with [`@dojo-ng/history`](https://www.npmjs.com/package/@dojo-ng/history): Back and Forward buttons, a controller that lets your own component follow the location, and a confirm-before-leaving helper. Install history once at startup (`installHistory(bus)`); these find it on their own. With history not installed, the buttons call `window.history.back()` and `window.history.forward()` and the controller reports no location.

## Install

```bash
npm install @dojo-ng/nav-history
```

## Usage

Import the package to register the custom element, then use the tag.

Plain Back. It is disabled at the first page of the app.

```html
<dj-back-button></dj-back-button>
<script type="module">
  import { createPubSub } from "@dojo-ng/pubsub";
  import { installHistory } from "@dojo-ng/history";
  import "@dojo-ng/nav-history";
  installHistory(createPubSub());
</script>
```

## Modes

- `history` (the default) does what the browser's Back button does, and is disabled when there is nowhere to go back to. With no history installed it calls `window.history.back()` and is never disabled.
- `up` goes to the parent of the current page instead, by dispatching `dj-navigate`. The parent is the second-to-last entry of the location's `trail` when it has one (a tracked `dj-tree` supplies it), otherwise the current path with its last segment removed. At the top level, a single-segment path or a trail of one, there is no parent, and the button behaves exactly as in `history` mode.

## Label

- In `up` mode with a parent, the label is "Back to {title}". The title is the trail entry's label, otherwise what `resolveTitle(parentPath)` returns. With no title, or in `history` mode, the label is "Back". Set `label` to replace the computed text.
- The label is recomputed on every location change, including when a trail arrives late, so it needs no timer.
- The accessible name always equals the visible label. With `icon-only`, only the arrow shows, the label becomes the accessible name, and a tooltip shows it on hover and focus.

## Taking over

- `dj-back` fires first and can be canceled. Call `preventDefault()` to do something else (confirm unsaved changes, close a panel); the button then does nothing further.

## HistoryController

- `new HistoryController(this)` in a Lit element. `controller.location` is the current location (`{ path, state, index, committed, source, trail? }`) or `undefined`, and `controller.history` is the history instance or `undefined`. The element re-renders on every location change.
- If history is installed after the element connects, the controller starts following then. After the element disconnects it follows nothing.

## Back, and up

- `mode="history"` (the default) is plain Back, disabled when there is nowhere to go.
- `mode="up"` goes to the parent page and labels itself "Back to {title}". The parent comes from the `trail` that a tracked `dj-tree` puts in the location, or else from the path with its last segment removed; give `resolveTitle` to name it. At the top level it acts like `history` mode.
- Call `preventDefault()` on `dj-back` to take over, for example to ask about unsaved changes.
- Set `icon-only` for just the arrow. The label stays the accessible name and shows in a tooltip.

## Forward

- `<dj-forward-button>` goes Forward. It is disabled until there is a Forward to go to: after a Back, and not after a new navigation, which clears Forward. After a reload with `sessionStorage` blocked it stays disabled, because history cannot know how far Forward goes.
- Call `preventDefault()` on `dj-forward` to take over. `label` and `icon-only` work as on the Back button.

## Asking before leaving

- `history.block(confirmLeave("You have unsaved changes."))` asks before every navigation and Back, with a modal dialog: Stay (focused first), Leave, Escape and the close button. Stay and Escape keep the page. Call `block` when the page becomes dirty and the function it returned when it is saved. Closing the tab shows the browser's own prompt while a blocker is active.
- `confirmLeave(message, { title?, leaveText?, stayText? })` is only a blocker. Write your own `(to, from) => boolean | Promise<boolean>` for any other rule.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `mode` | mode ↻ | `BackMode` | `"history"` |
| `label` | label | `string` | — |
| `iconOnly` | icon-only ↻ | `boolean` | `false` |
| `resolveTitle` | — | `(path: string) => string \| undefined` | — |

## CSS parts

- `button`: The composed `<dj-button>`.

## Events

- `dj-back`: Cancelable, detail `{ mode, target }`.
- `dj-navigate`: Detail `{ path, label?, trail? }`.

## Methods

- `focus(options: FocusOptions)`
- `blur()`

## Examples

### Up to the parent page

In `up` mode the label names the parent. Here `resolveTitle` supplies the title, because the path has no trail.

```html
<dj-back-button id="up" mode="up"></dj-back-button>
<script type="module">
  import "@dojo-ng/nav-history";
  const titles = { "/orders": "Orders" };
  document.getElementById("up").resolveTitle = (path) => titles[path];
  document.getElementById("up").addEventListener("dj-back", (e) => console.log(e.detail.mode, e.detail.target));
</script>
```

### Follow the location in your own element

A controller re-renders the element whenever the location changes.

```js
import { LitElement, html } from "lit";
import { HistoryController } from "@dojo-ng/nav-history";

class WhereAmI extends LitElement {
  #nav = new HistoryController(this);
  render() { return html`You are at ${this.#nav.location?.path ?? "..."}`; }
}
customElements.define("where-am-i", WhereAmI);
```

### Forward button

Disabled until a Back has happened; enabled again by it.

```html
<dj-back-button></dj-back-button>
<dj-forward-button></dj-forward-button>
<script type="module">
  import { createPubSub } from "@dojo-ng/pubsub";
  import { installHistory } from "@dojo-ng/history";
  import "@dojo-ng/nav-history";
  installHistory(createPubSub());
</script>
```

### Ask before leaving

While the form has unsaved text, a Back or a link asks first.

```js
import { installHistory } from "@dojo-ng/history";
import { confirmLeave } from "@dojo-ng/nav-history";

const history = installHistory(bus);
let unblock;
form.addEventListener("input", () => {
  unblock ??= history.block(confirmLeave("You have unsaved changes."));
});
form.addEventListener("submit", () => { unblock?.(); unblock = undefined; });
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
