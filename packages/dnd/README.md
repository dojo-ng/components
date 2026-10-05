# @dojo-ng/dnd

Drag and drop for Dojo NG components, built on pointer events.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/dnd
```

## Usage

In a Lit component, create a `DragZoneController` over the item container, and apply each move in `onMove`.

```js
import { DragZoneController } from "@dojo-ng/dnd";

class MyList extends LitElement {
  #zone = new DragZoneController(this, {
    container: () => this.renderRoot.querySelector(".items"),
    items: () => [...this.renderRoot.querySelectorAll("[data-key]")],
    zoneId: "list",
    axis: "y",
    onMove: ({ key, fromIndex, toIndex }) => {
      // reorder your data, then re-render
    },
  });
}
```

## How it works

- It works inside shadow roots and with touch, mouse, and pen. It has no dependencies.
- Drops are controlled: the zone calls `onMove`, and your code applies the change.
- Zones that share a `group` accept items from each other.

## Accessibility

- Drag is an enhancement. A component that uses dnd must also offer a keyboard or menu way to move items, as WCAG 2.5.7 requires.
- For a component with no move controls of its own, `keyboardGrabMode` adds keyboard moves. See the example below.

## Examples

### Keyboard grab mode

Connect `keyboardGrabMode` to a keydown handler. Your `announce` callback receives the messages for a live region.

- Space picks up the focused item, and the arrow keys move it.
- Space drops the item, and Escape cancels the move.

```js
import { keyboardGrabMode } from "@dojo-ng/dnd";

const onKeydown = keyboardGrabMode({
  zones: () => [this.zoneConfig],
  announce: (msg) => this.liveRegion.textContent = msg,
});
```
