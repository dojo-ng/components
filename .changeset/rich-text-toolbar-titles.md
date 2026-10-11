---
"@dojo-ng/rich-text": patch
---

Give every `dj-rich-text` toolbar button hover text. The default toolbar renderer set only `aria-label`, so Bold, Italic, Underline, Undo, Redo, and any plugin item without its own `render` showed no tooltip. Each item's `label` now also becomes the `title` of the native button inside `dj-button`, which is where the pointer hovers. The accessible name is still the label, and the host element gets no `title` of its own. Items with a custom `render` are unchanged.
