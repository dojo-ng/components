---
"@dojo-ng/snackbar": minor
---

`dj-snackbar` gains `quiet`, which turns off its own live regions and leaves the message readable, so a container can announce for it, and a `warning` type. `<dj-toaster>` in the new `@dojo-ng/toast` package (first published at 0.1.0) renders each toast as a quiet snackbar and announces for all of them, because several snackbars writing into their own regions are announced out of order.
