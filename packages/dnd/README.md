# @dojo-ng/dnd

Dojo NG drag-and-drop primitive (pointer-events core: shadow DOM + touch, no dependency)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> The keyboard/menu path in a consuming component is the accessibility contract (WCAG 2.5.7); drag is enhancement layered on top. The pointer core works inside shadow roots and on touch, mouse, and pen alike, with no dependency. Drops are CONTROLLED: the zone calls `onMove` and the consumer applies the change.

## Install

```bash
npm install @dojo-ng/dnd
```

## Usage

In a Lit component, construct a `DragZoneController` over the item container. Drops are controlled — apply the change in `onMove`. Zones sharing a `group` accept transfers from each other.

```html
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

## Examples

### Keyboard grab mode

For components without their own move UI, wire `keyboardGrabMode` to a keydown handler: space grabs the focused item, arrows move it, space drops, escape cancels. Announcements go through your callback.

```html
import { keyboardGrabMode } from "@dojo-ng/dnd";

const onKeydown = keyboardGrabMode({
  zones: () => [this.zoneConfig],
  announce: (msg) => this.liveRegion.textContent = msg,
});
```
