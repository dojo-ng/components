---
"@dojo-ng/title-pane": patch
---

Collapsed `dj-title-pane` content can no longer be focused or read (CB27): it is `inert` and turns `visibility: hidden` once the collapse animation ends. The title button points at the content with `aria-controls`.
