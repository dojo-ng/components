---
"@dojo-ng/data-grid": patch
---

Keep a selected row's tint while the pointer is over it. In `dj-data-grid`'s own styles, the hover rule outranked the selected rule, so a ticked row turned the plain hover color under the pointer and read as unticked. Forced-colors mode had the same problem: a hovered selected row dropped from `Highlight` to `Canvas`. Selected rows now keep their selection colors when hovered, in both modes.
