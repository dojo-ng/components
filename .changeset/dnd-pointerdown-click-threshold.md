---
"@dojo-ng/dnd": patch
---

Fix a draggable item's own click handler never firing. `pointerdown` no longer calls `preventDefault()` unconditionally; a plain click (or any movement under a 5px threshold) now reaches the browser's native click synthesis, and only a real drag past that threshold suppresses the default.
