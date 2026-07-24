# @dojo-ng/tree

`<dj-tree>` — A hierarchical tree from `nodes`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A hierarchical tree from `nodes`. Each node may carry an `icon` (a registered icon name) and a `count` (a trailing badge, e.g. an unread count). Selection is controlled by `value` (a node id) and emits `dj-select`; expansion is controlled by `expanded` (an array of node ids) and emits `dj-expand-change`. The component knows nothing about what the tree holds — a file tree, a mail folder list, or a MIME structure are all just nodes. A row click selects; the chevron expands. Set `expand-on-row-click` when the tree has rows that exist only to contain others, where selecting one means nothing and the click would be dead. Keyboard follows the APG tree pattern with a roving tabindex: exactly one row is tabbable (the selected row if visible, else the first visible row), and the arrow keys move focus without selecting. Down/Up walk the visible rows; Right expands a closed parent, steps into an open one, and does nothing on a leaf; Left collapses an open parent or moves to the parent row; Home/End jump to the first/last visible row; Enter or Space selects the focused row. Indentation is a logical `margin-inline-start`, so it flips in RTL, and the chevron mirrors with the reading direction. Deferred (not built): drag-drop, virtualization, checkboxes, lazy loading.

> Selection and expansion are both controlled: `value` is the selected node id (emits `dj-select`) and `expanded` is an array of open node ids (emits `dj-expand-change` with `{ id, expanded, expandedIds }`). Node `icon` names must be registered with `registerIcon`/`registerIcons` from `@dojo-ng/icon`; `count` renders as a trailing badge. Keyboard is the APG tree pattern with a roving tabindex — only one row is ever a tab stop, arrows move focus without selecting (Right/Left expand/collapse or move in/out, Home/End jump), and Enter or Space selects. Style indentation with `--dj-tree-indent` and the count with `--dj-tree-count-color`. Not built yet: drag-drop, virtualization, checkboxes, lazy loading.

## Install

```bash
npm install @dojo-ng/tree
```

## Usage

Import the package to register the custom element, then use the tag.

Each node can carry an `icon` (a registered icon name) and a `count` (a trailing badge, e.g. unread mail). `value` is the selected node id and `expanded` is the controlled array of open node ids; the tree emits `dj-select` and `dj-expand-change`. Keyboard is the APG tree pattern with a roving tabindex — arrows move focus (Right/Left expand/collapse), Enter selects.

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

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `nodes` | nodes | `TreeNode[]` | `[]` |
| `value` | value | `string` | `""` |
| `expanded` | expanded | `string[]` | `[]` |
| `expandOnRowClick` | expand-on-row-click ↻ | `boolean` | `false` |

**Slots:** `none` (content comes from `nodes`)

**Parts:** `row` (a node's clickable line), `chevron`, `label`, `count`

**Events:** `dj-expand-change` (detail `{ id, expanded, expandedIds }`), `dj-select` (detail `{ id }`)

**CSS properties:** `--dj-tree-indent` (default `1.1rem`; Indentation added per nesting level.), `--dj-tree-count-color` (default `var(--dj-color-text-muted)`; Color of the trailing count badge.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
