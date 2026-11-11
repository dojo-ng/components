---
"@dojo-ng/snackbar": patch
"@dojo-ng/tooltip": patch
---

Snackbar and tooltip accessibility (CB33). `dj-snackbar` keeps its live regions in the accessibility tree while closed and writes the message into them on open, so screen readers announce it; `type="error"` announces assertively (`role="alert"`). The success fill is `--dj-color-success-700` with white text (5.0:1; it was 3.3:1). A closed snackbar's host is no longer `display: none`, only its bar.

`dj-tooltip` sets `aria-describedby` on the slotted trigger, pointing at the slotted tip. Where the Popover API exists the tip renders in the top layer, so an `overflow: hidden` or transformed ancestor no longer clips it, and it flips to the opposite side when the preferred side has no room.
