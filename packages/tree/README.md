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

## Not built

- Drag and drop, virtualization, checkboxes, and lazy loading.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `nodes` | nodes | `TreeNode[]` | `[]` |
| `value` | value | `string` | `""` |
| `expanded` | expanded | `string[]` | `[]` |
| `expandOnRowClick` | expand-on-row-click ↻ | `boolean` | `false` |

## Slots

- `none`: Content comes from `nodes`.

## CSS parts

- `row`: A node's clickable line.
- `chevron`
- `label`
- `count`

## Events

- `dj-expand-change`: Detail `{ id, expanded, expandedIds }`.
- `dj-select`: Detail `{ id }`.

## CSS custom properties

- `--dj-tree-indent`: Indentation added per nesting level. Default `1.1rem`.
- `--dj-tree-count-color`: Color of the trailing count badge. Default `var(--dj-color-text-muted)`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
