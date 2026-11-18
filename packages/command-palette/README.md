# @dojo-ng/command-palette

`<dj-command-palette>` — Search and run the actions in a `@dojo-ng/commands` registry.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Put one on the page. It opens with `shortcut` (Mod+K by default; Cmd+K on a Mac, Ctrl+K elsewhere), or with `show()`. Type to narrow the list, use the arrow keys and Enter to run a command, and Escape to close; focus goes back to where it was.

## Install

```bash
npm install @dojo-ng/command-palette
```

## Usage

Import the package to register the custom element, then use the tag.

Put one on the page and register commands. Press Ctrl+K (Cmd+K on a Mac) to open it.

```html
<dj-command-palette></dj-command-palette>
<script type="module">
  import "@dojo-ng/command-palette";
  import { commands } from "@dojo-ng/commands";

  commands.register({ id: "new-note", label: "New note", group: "File", shortcut: "Mod+Shift+N", run: () => console.log("new note") });
  commands.register({ id: "dark", label: "Switch theme", group: "View", keywords: "dark light", run: () => console.log("theme") });
</script>
```

## What it lists

- The commands that apply now: those whose `when` is not false, and those registered on a scope that holds the focus the palette opened from, plus global ones.
- With nothing typed, recently run commands come first, then the rest under their `group` headings. Recent commands are kept in memory only.
- Every word typed must appear in a command's group, label, or keywords, in any order. A label that starts with the first word ranks first.
- Each command's shortcut is shown at the end of its row.

## Shortcut help

- Press `?` with nothing typed, or call `showHelp()`, to list every active shortcut by group. The list follows the focus the palette opened from, so a grid's keys show while the grid has focus.

## Accessibility

- The text input is a combobox that keeps focus. The highlighted command is read from a live region ("Save document, 2 of 7"), because the list's rows are in another shadow root.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `shortcut` | shortcut | `string` | `"Mod+K"` |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `registry` | — | `CommandRegistry` | `commands` |

## CSS parts

- `dialog`
- `input`
- `list`

## Events

- `dj-close`
- `dj-command-run`

## Methods

- `show()`: Open the palette, listing the commands that apply where focus is now.
- `hide()`
- `toggle()`
- `showHelp()`: Open the palette on its list of active shortcuts.

## Examples

### Open it from a button

`show()` opens the palette from code and `showHelp()` opens the list of shortcuts.

```html
<dj-button id="open">Commands</dj-button>
<dj-button id="keys">Keyboard shortcuts</dj-button>
<dj-command-palette id="palette"></dj-command-palette>
<script type="module">
  import "@dojo-ng/command-palette"; import "@dojo-ng/button";
  document.getElementById("open").addEventListener("click", () => palette.show());
  document.getElementById("keys").addEventListener("click", () => palette.showHelp());
</script>
```

### Choose the opening key

`shortcut` takes the same form as a command's shortcut.

```html
<dj-command-palette shortcut="Mod+P"></dj-command-palette>
```

### React to a run

`dj-command-run` fires after a command runs from the palette, for example to keep a recent list in storage.

```js
palette.addEventListener("dj-command-run", (e) => localStorage.setItem("last-command", e.detail.id));
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Localization

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
