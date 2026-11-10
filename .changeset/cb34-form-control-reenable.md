---
"@dojo-ng/dojo-element": patch
"@dojo-ng/radio-group": patch
---

Fix form controls that stayed disabled after `disabled` was turned back off (CB34). The browser reports the control's own `disabled` change while Lit is part way through an update, and that change was lost, so the inner control (the `dj-select` trigger, the native input) stayed disabled even though the host looked enabled. The control now renders again once the update finishes. `dj-radio-group` also re-enables the slotted radios it disabled when the group is enabled again, and leaves alone any radio the page disabled itself.
