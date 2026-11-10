---
"@dojo-ng/rich-text-table": patch
"@dojo-ng/rich-text-emoji": patch
---

Make table header cells and the emoji grid hover follow the theme in dark mode. Both used `--dj-color-background-alt`, which no theme defines, so the light fallback always applied. They now use `--dj-color-neutral-100`, and header cells also set their text color from `--dj-color-text`. When a `value` is set back into the editor, the table plugin also drops the light fill that Lexical writes inline on header cells. HTML exported from the editor still carries that fill, so email and other HTML readers are unchanged.
