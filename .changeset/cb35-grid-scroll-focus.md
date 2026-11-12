---
"@dojo-ng/data-grid": minor
---

The grid is now one focusable scroll container, so axe no longer reports `scrollable-region-focusable` on a grid whose rows or columns overflow (CB35).

- The `role="grid"` element (`part="grid"`, the one Tab stop) is now also the element that scrolls. Before, focus sat on the grid while an inner, unfocusable element scrolled, which axe and some assistive tech could not see as keyboard reachable. Keyboard behavior is unchanged.
- The header row and any plugin subheader rows are a sticky strip inside that scroller. They follow the body sideways on their own (the scroll-position sync is gone), pinned header cells stick against the same edge as pinned body cells, and the vertical scrollbar now runs the full height of the grid, beside the header too.
- `height` keeps its meaning: it is the height of the rows' viewport. The grid adds the header strip's height to it, so a grid shows the same number of rows as before.
- Rows start below the header, and the keyboard, `scrollToIndex`, PageUp/PageDown, and `getVisibleRange()` keep the active and visible rows clear of the sticky header.
- The virtualizer measures the grid's client box, so the border and a horizontal scrollbar no longer count as room for rows.
- Styling note: the internal `.scroll` element is gone. Styles or tests that reached into the shadow root for `.scroll` should use `[part="grid"]`.
