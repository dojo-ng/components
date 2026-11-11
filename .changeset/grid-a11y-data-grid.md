---
"@dojo-ng/data-grid": patch
---

Keyboard and screen reader fixes.

- Keys typed into a control inside the grid, such as the filter plugin's subheader inputs, now reach that control. Space, Home, End and the arrow keys used to move the active row instead.
- Sorting works from the keyboard. ArrowUp from the first row moves to the header row, Left and Right move between headers (mirrored in right-to-left layouts), Home and End go to the first and last header, Enter or Space sorts, and ArrowDown returns to the first row. The grid is still a single tab stop.
- A sortable header now holds a `<button part="sort-button">`, so it has a button role and name. The sort arrow is hidden from screen readers. `aria-sort` is `ascending` or `descending` on a sorted column and absent otherwise (it used to be `none` on every sortable column).
- The grid sets `aria-colcount`, and header, filter and body cells set `aria-colindex`.
