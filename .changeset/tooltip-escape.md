---
"@dojo-ng/tooltip": patch
---

Escape now dismisses a visible tooltip without moving focus (WCAG 1.4.13 dismissable). The listener is added on show and removed on hide and on disconnect.
