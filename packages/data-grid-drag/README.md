# @dojo-ng/data-grid-drag

Drag rows out of a `<dj-data-grid>` with native HTML5 drag and drop, for example onto a `<dj-tree>` folder list.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-drag
```

## Usage

The grid writes the dragged rows' ids under its own MIME type; the tree accepts only that type, and `dj-drop` names the folder.

```html
<dj-tree id="folders"></dj-tree>
<dj-data-grid id="mail" height="320px" activation="click" selection-mode="multiple"></dj-data-grid>
<script type="module">
  import "@dojo-ng/tree";
  import "@dojo-ng/data-grid";
  import { selectColumnPlugin } from "@dojo-ng/data-grid-select";
  import { rowDragPlugin } from "@dojo-ng/data-grid-drag";
  const TYPE = "application/x-demo-messages";

  const tree = document.getElementById("folders");
  tree.nodes = [{ id: "inbox", label: "Inbox" }, { id: "archive", label: "Archive" }];
  tree.canDrop = (id, types) => types.includes(TYPE);
  tree.addEventListener("dj-drop", (e) => {
    const ids = JSON.parse(e.detail.dataTransfer.getData(TYPE));
    move(ids, e.detail.id);
  });

  const grid = document.getElementById("mail");
  grid.columns = [{ id: "from", header: "From" }, { id: "subject", header: "Subject" }];
  grid.getRowId = (m) => String(m.id);
  grid.data = [
    { id: 1, from: "Ada", subject: "Analytical engine" },
    { id: 2, from: "Grace", subject: "Compiler notes" },
  ];
  grid.plugins = [
    selectColumnPlugin({ label: (m) => `Select ${m.subject}` }),
    rowDragPlugin({
      type: TYPE,
      data: (rows) => JSON.stringify(rows.map((m) => m.id)),
      label: (rows) => (rows.length === 1 ? rows[0].subject : `${rows.length} messages`),
    }),
  ];
</script>
```

## How it works

- Every row becomes `draggable`. Dragging a selected row drags every selected row; dragging an unselected row drags it alone and leaves the selection as it was.
- The payload is yours: `data(rows)` is written to the drag under the MIME type you name in `type`. A drop target checks for that type, which is the only part of a payload the browser shows before the drop.
- The drag image is a small chip. `label(rows)` sets its text (default "1 row" / "N rows").
- Clicking, double clicking, and the checkbox column work as before: a drag only starts once the pointer moves, and a drag that starts on a control inside a cell is canceled.

## Events

- `dj-row-dragstart` (cancelable, detail `{ rows }`) and `dj-row-dragend` (detail `{ rows, dropEffect }`). Dragged rows carry the `row--dragging` part until the drag ends.

## Accessibility

- Dragging has no keyboard form. Offer the same action another way, such as a Move command with a picker (WCAG 2.5.7).
