# @dojo-ng/tree

`<dj-tree>` — A hierarchical tree built from `nodes`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The tree knows nothing about what it shows: a file tree, a mail folder list, and a MIME structure are all just nodes. Each node can carry an `icon` (a name registered with `registerIcon` or `registerIcons` from `@dojo-ng/icon`) and a `count`, shown as a trailing badge such as an unread count.

## Install

```bash
npm install @dojo-ng/tree
```

## Usage

Import the package to register the custom element, then use the tag.

Folders with registered icons and unread counts. The tree reports selection with `dj-select` and opened folders with `dj-expand-change`.

```html
<dj-tree id="folders" value="inbox"></dj-tree>
<script type="module">
  import "@dojo-ng/tree";
  import { registerIcons } from "@dojo-ng/icon";
  registerIcons({
    inbox: '<svg viewBox="0 0 24 24"><path d="M4 13h4l2 3h4l2-3h4M4 13V5h16v8M4 13v6h16v-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v10H3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  });
  const t = document.getElementById("folders");
  t.expanded = ["archive"];
  t.nodes = [
    { id: "inbox", label: "Inbox", icon: "inbox", count: 12 },
    { id: "archive", label: "Archive", icon: "folder", children: [
      { id: "y2025", label: "2025", icon: "folder" },
      { id: "y2024", label: "2024", icon: "folder" },
    ] },
    { id: "trash", label: "Trash", icon: "folder" },
  ];
  t.addEventListener("dj-select", (e) => console.log("select", e.detail.id));
  t.addEventListener("dj-expand-change", (e) => console.log("expanded", e.detail.expandedIds));
</script>
```

## Selection and expansion

- Both are controlled. `value` is the selected node id, and the tree emits `dj-select`.
- `expanded` is the array of open node ids, and the tree emits `dj-expand-change`.
- Clicking a row selects it; clicking the chevron expands or collapses it.
- Set `expand-on-row-click` to make a click on a parent row also expand or collapse it. Use it when some rows exist only to hold others, so a click on them does something visible.

## Keyboard

The tree follows the APG tree pattern. Only one row is a tab stop: the selected row if it is visible, otherwise the first visible row. The arrow keys move focus without selecting.

- Down and Up move through the visible rows.
- Right expands a closed parent, moves into an open one, and does nothing on a leaf.
- Left collapses an open parent, or moves to the parent row.
- Home and End jump to the first and last visible row.
- Enter or Space selects the focused row.

## Right-to-left

- Indentation uses `margin-inline-start`, so it flips in a right-to-left page, and the chevron points in the reading direction.

## Dropping onto rows

- Set `canDrop` to make the tree a target for native HTML5 drag and drop. It is called during a drag with a row id and the drag's `dataTransfer.types` (the only part of a payload the browser shows before the drop), and returns whether that row accepts it. Unset, the tree ignores drags.
- The row under the pointer that accepts the drag is marked: the `row--drop-target` part and a built-in outline. A refused row is not marked and the cursor shows the drop is not allowed.
- Resting on a collapsed parent for `spring-delay` ms (default 800; 0 turns it off) during a drag expands it, through the same path as a chevron click, so `dj-expand-change` fires. It stays open after the drop.
- A drop emits `dj-drop` with `{ id, dataTransfer }`. The tree does not select the row; the consumer reads its payload from `dataTransfer` and applies the change.
- Dragging has no keyboard form. A consumer that offers drop must offer another way to do the same thing (WCAG 2.5.7), such as a Move command with a picker.

## Tracking navigation

Set `track` and the tree and `@dojo-ng/history` follow each other, with no route table to write.

- Each node has a path: its own `path` if it sets one, otherwise `base-path` plus the ids from the root down to the node, joined with `/` (each id URI-encoded). A tree with `base-path="/explore"` gives the node `hr` &gt; `comp` &gt; `pay` the path `/explore/hr/comp/pay`.
- Selecting a row (click, Enter, or Space) emits `dj-navigate` with `{ path, label, trail }` alongside `dj-select`. `trail` is the nodes from the root to this one, each as `{ path, label }`, and ends up in the history entry, so it survives Back, Forward, and a reload in the same tab.
- When the location changes, the tree selects the node whose path matches it (an exact match, else the node with the longest path that is a prefix of the location) and expands that node's ancestors, emitting `dj-expand-change` for each. This is what makes Back reselect the right row. It does not emit `dj-navigate`, because that would loop. It does not emit `dj-select` either.
- If the location has no `trail` (a deep link, or a pasted URL), the tree adds the matched node's trail to the history entry, so a `dj-back-button` in `up` mode can name the parent.
- Ctrl-click, Cmd-click, or middle-click on a row opens its path in a new tab. Rows stay `treeitem`s and not links, because a focusable link inside a treeitem would break the tree's roving focus. Two nodes with the same path: the first in tree order wins.
- `track` needs `@dojo-ng/history` installed. Without it nothing is tracked and nothing throws.

## Long trees

- Above `virtual-threshold` visible rows (default 200) the tree is virtual: only the rows in view (plus the focused one) are in the DOM, and the tree scrolls inside `--dj-tree-max-height` (20rem by default while virtual). Every row carries `aria-level`, `aria-setsize`, and `aria-posinset`, so assistive technology still knows its place among all of them.
- Rows have one height, measured from the first row. Keyboard, `track`, and Back all work on rows that are not rendered: the tree scrolls the active row into view first.

## Lazy children

- A node with `hasChildren: true` and no `children` shows a chevron. Opening it, by any route (the chevron, the keyboard, spring-open, an `expanded` the app sets, or `track`), emits `dj-load-children` with `{ id }` once, and the node shows a "Loading" row under it.
- The app answers with `setChildren(id, nodes)`. The tree stores `nodes` as that node's `children` and renders them. An empty array makes the node a leaf. Answers can arrive in any order and any time; one for a node that no longer exists is ignored (the method returns false).
- On failure the app calls `setChildren(id, null, { error })`. The row under the node becomes a retry row; Enter, Space, or a click on it emits `dj-load-children` again.
- With `track`, a location below an unloaded node opens that node and so asks for its children; when they arrive the tree matches again and goes one level deeper, so a deep link emits one load per level, in order, until the node is found.

## Checkboxes

- Set `checkable` to show a checkbox on every node. Checking is separate from selecting: Space toggles the check, Enter still selects, and clicking the box does not select the row.
- `checked` is the array of checked ids (controlled). Toggling updates it and emits `dj-check-change` with `{ id, checked, partial, pendingParents }`.
- Checking a parent checks every loaded node below it; unchecking clears them and the parent's own checked ancestors. A parent with loaded children shows what they show: all checked, some (`aria-checked="mixed"`), or none. An id in `checked` also checks everything loaded below it.
- `partial` lists the parents showing the mixed state. `pendingParents` lists checked lazy nodes whose children are not loaded; the tree cannot know what is below them, so the app resolves those on the server. Children that load later under a checked parent arrive checked.

## Dragging rows

- Set `draggable-rows` to make every row a drag source (native HTML5 drag and drop, so a row can land on this tree, another tree, a grid, or any page element that reads the drag). The drag carries a JSON array of node ids under `drag-type` (default `application/x-dojo-tree-rows`) and the labels as `text/plain`. The preview chip shows the label, or the count for several.
- A row that is not checked drags alone. With `checkable`, a checked row drags every checked row, top-most only (a checked parent carries what is below it); that is the multi-row drag.
- Within one tree the pointer picks where a drop lands: the top edge of a row is "before", the bottom edge "after", the middle "inside". The bottom edge of an open parent is "inside", since "after" would draw above its first child. A line marks before and after (parts `row--drop-before`, `row--drop-after`); "inside" uses `row--drop-target` as a drop does. A row can go "inside" a row that has children, or any row `canDrop` accepts. A drop on a dragged row or anything below it is refused.
- The tree emits `dj-move` with `{ ids, target, position }` and changes nothing; the app edits `nodes`. A drag from another tree or a grid is a plain drop: `canDrop` and `dj-drop` as above.
- Dragging has no keyboard form, as with drops. Offer a "Move…" command (WCAG 2.5.7).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `nodes` | nodes | `TreeNode[]` | `[]` |
| `value` | value | `string` | `""` |
| `expanded` | expanded | `string[]` | `[]` |
| `expandOnRowClick` | expand-on-row-click ↻ | `boolean` | `false` |
| `canDrop` | — | `(id: string, types: readonly string[]) => boolean` | — |
| `springDelay` | spring-delay | `number` | `800` |
| `track` | track | `boolean` | `false` |
| `checkable` | checkable ↻ | `boolean` | `false` |
| `checked` | checked | `string[]` | `[]` |
| `draggableRows` | draggable-rows ↻ | `boolean` | `false` |
| `dragType` | drag-type | `string` | `"application/x-dojo-tree-rows"` |
| `virtualThreshold` | virtual-threshold | `number` | `200` |
| `basePath` | base-path | `string` | `""` |

## Slots

- `none`: Content comes from `nodes`.

## CSS parts

- `row`: A node's clickable line.
- `checkbox`: The box, with `checkable`.
- `loading`
- `row--drop-before`
- `row--drop-target`: Added to the row a drag would drop
on.
- `chevron`
- `label`
- `count`

## Events

- `dj-load-children`: Detail `{ id }`.
- `dj-check-change`: Detail `{ id, checked, partial, pendingParents }`, only with `checkable`.
- `dj-expand-change`: Detail `{ id, expanded, expandedIds }`.
- `dj-move`: Detail `{ ids, target, position }`, a drag within this tree.
- `dj-drop`: Detail `{ id, dataTransfer }`.
- `dj-select`: Detail `{ id }`.
- `dj-navigate`: Detail `{ path, label, trail }`, only with `track`.

## Methods

- `setChildren(id: string, children: TreeNode[] | null, options: { error?: unknown }): boolean`: Answer a `dj-load-children`: store `children` on the node `id` and render them. For a failed load pass `null` and `{ error }`; the node then shows a retry row. Returns false when no node has that id (the tree was replaced while the load ran), and then does nothing.

## CSS custom properties

- `--dj-tree-indent`: Indentation added per nesting level. Default `1.1rem`.
- `--dj-tree-max-height`: Height the tree scrolls at while virtual. Default `20rem`.
- `--dj-tree-count-color`: Color of the trailing count badge. Default `var(--dj-color-text-muted)`.

## Examples

### Large lazy tree with checkboxes and dragging

A tree windows its rows above 200, so 50,000 nodes stay cheap. Groups load when opened (`dj-load-children`, answered with `setChildren`), `checkable` adds tri-state checkboxes, and `draggable-rows` lets rows be moved: the tree reports a drop in the same tree as `dj-move` and the app edits `nodes`.

```html
<dj-tree id="big" checkable draggable-rows></dj-tree>
<script type="module">
  import "@dojo-ng/tree";
  const t = document.getElementById("big");
  t.nodes = Array.from({ length: 50 }, (_, g) => ({ id: `g${g}`, label: `Group ${g}`, hasChildren: true }));
  t.addEventListener("dj-load-children", async (e) => {
    try {
      const rows = await fetchChildren(e.detail.id);   // your server call
      t.setChildren(e.detail.id, rows);
    } catch (error) {
      t.setChildren(e.detail.id, null, { error });      // shows a retry row
    }
  });
  t.addEventListener("dj-check-change", (e) => {
    // e.detail.pendingParents: checked groups whose children are not loaded; resolve them on the server
    console.log(e.detail.checked, e.detail.partial, e.detail.pendingParents);
  });
  t.addEventListener("dj-move", (e) => {
    const { ids, target, position } = e.detail;       // "before" | "after" | "inside"
    t.nodes = applyMove(t.nodes, ids, target, position); // your update of the data
  });
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
