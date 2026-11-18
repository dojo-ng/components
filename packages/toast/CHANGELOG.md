# @dojo-ng/toast

## 0.2.0

### Minor Changes

- Add a command registry and palette, and move the toaster's shortcut onto the registry.

  - New `@dojo-ng/commands` (no elements) and `@dojo-ng/command-palette` (`<dj-command-palette>`), both at 0.1.0. They publish from their package.json, as `toast` did.
  - `dj-list` options take `heading: true` (a group heading row that is not an option) and `hint` (text at the end of the row, such as a shortcut), and the list has an `activeOption` getter. `dj-select` skips headings. All of it is optional and changes nothing for existing options, so these are patches.
  - `dj-toaster` registers its `shortcut` (Alt+T by default) as the command `dj-toaster.focus` through `@dojo-ng/commands`, so it shows in the palette's shortcut help. It now does nothing, and is not swallowed, while no toast is showing. `@dojo-ng/toast` depends on `@dojo-ng/commands`, and the `matchesShortcut` export is removed.

## 0.1.1

### Patch Changes

- Updated dependencies
  - @dojo-ng/snackbar@0.2.0
