---
"@dojo-ng/tab-container": patch
---

`dj-tab-container` keyboard and ARIA fixes (CB28). Arrow keys, Home and End skip disabled tabs instead of stopping on them. An `active-index` that points at no tab or a disabled one still leaves one tab in the Tab order. Delete closes a closeable tab (advertised with `aria-keyshortcuts`); Escape no longer does. The close icon is pointer-only, so no `role="button"` sits inside a tab. Each panel is labelled with its tab's name unless the page labelled it, tabs point at their panels with `ariaControlsElements` where supported, and an inactive panel stays hidden even when page CSS gives panels a `display`.
