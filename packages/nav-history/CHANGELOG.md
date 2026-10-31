# @dojo-ng/nav-history

## 0.2.0

### Minor Changes

- Add `dj-forward-button`, which follows `@dojo-ng/history` and is disabled until there is a Forward to go to, and `confirmLeave(message)`, a blocker for `history.block()` that asks with a modal dialog before leaving. Needs `@dojo-ng/history` 0.2.0.

### Patch Changes

- Depend on `@dojo-ng/history` 0.3.0, so an app gets one copy of history alongside `dj-split-panel`.
- Updated dependencies
  - @dojo-ng/tooltip@0.1.2
