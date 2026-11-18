# @dojo-ng/commands

A registry of app actions with keyboard shortcuts. It has no elements, so an app can use shortcuts without the palette, and `@dojo-ng/command-palette` reads the same registry.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/commands
```

## Usage

Commands go in one registry; the shortcut runs the same function the palette runs.

```js
import { commands } from "@dojo-ng/commands";

commands.register({
  id: "save",
  label: "Save document",
  group: "File",
  shortcut: "Mod+S",
  run: () => saveDocument(),
});

commands.register({
  id: "go-inbox",
  label: "Go to inbox",
  group: "Go to",
  shortcut: "G I",
  when: () => signedIn(),
  run: () => navigate("/inbox"),
});
```

## Commands

- A command is `{ id, label, group?, keywords?, shortcut?, when?, allowInText?, run }`.
- `when` says whether the command applies now. The palette hides a command where it returns `false`, and its shortcut does nothing.
- `commands.register(command)` returns a function that removes it. Registering an id again replaces the first.
- `commands.active(focusedElement)` lists what applies now. `commands.execute(id)` runs one by id.
- `commands.onRun(listener)` and `commands.onChange(listener)` report runs and registrations.

## Shortcuts

- Write `"Mod+K"` or `"Alt+Mod+Digit1"`. `Mod` is Cmd on a Mac and Ctrl elsewhere. Letters, digits, `Enter`, `Escape`, `Space`, `Tab`, the arrows, `F1` to `F12` and punctuation such as `.` and `/` are known. A typo throws when you register.
- Keys match on `event.code`, never `event.key`, because Option changes the character a key types on a Mac.
- A sequence is written with spaces: `"G I"`. The next key must come within 1 second.
- `Mod+W`, `Mod+T`, `Mod+N` and `Mod+Q` belong to the browser. A command that asks for one is registered without a key, with a console warning.
- Two commands on the same shortcut in the same scope log one warning naming both ids. The first one registered wins.
- A shortcut does not fire while the user types in a text field, unless the command sets `allowInText`.
- `formatShortcut("Mod+K")` returns `⌘K` on a Mac and `Ctrl+K` elsewhere, for showing next to a menu item.

## Scopes

- `commands.scope(element).register(command)` ties a command to an element. Its shortcut fires only while focus is inside that element, including inside shadow roots. The innermost scope wins, then global commands.
- `scope.dispose()` removes everything that scope registered.
- The registry listens on the document from the first `commands.register`. `new CommandRegistry({ platform })` makes a separate registry; call `registry.attach(target)` to listen.

## Examples

### Keys that apply inside one panel

A scoped command fires only while focus is inside its element, so a grid and an editor can both use Delete.

```js
import { commands } from "@dojo-ng/commands";

const grid = document.querySelector("dj-data-grid");
const scope = commands.scope(grid);
scope.register({ id: "delete-rows", label: "Delete selected rows", group: "Grid", shortcut: "Delete", run: removeRows });

// When the grid is removed:
scope.dispose();
```

### Show a shortcut

Format a shortcut for the reader's platform.

```js
import { formatShortcut } from "@dojo-ng/commands";

formatShortcut("Mod+K");        // "⌘K" on a Mac, "Ctrl+K" elsewhere
formatShortcut("Alt+Mod+1");    // "⌥⌘1" on a Mac, "Ctrl+Alt+1" elsewhere
```
