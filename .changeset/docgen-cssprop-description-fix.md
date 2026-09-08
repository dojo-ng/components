---
"@dojo-ng/dialog": patch
"@dojo-ng/floating-action-button": patch
"@dojo-ng/header": patch
"@dojo-ng/list": patch
"@dojo-ng/progress": patch
"@dojo-ng/slide-pane": patch
"@dojo-ng/snackbar": patch
---

Fix the README's lead description having a `@cssprop` doc block glued onto the end of its prose (a doc-generator bug that affected any component whose JSDoc has no Slots/Parts/Events/Methods section label). No code change; README and manifest description text only.
