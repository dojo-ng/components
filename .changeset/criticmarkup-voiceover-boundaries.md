---
"@dojo-ng/rich-text-criticmarkup": patch
---

Screen readers now hear suggested changes. VoiceOver read the text inside `<ins>`/`<del>` as plain text, and word-by-word reading skipped a substitution's old word entirely. When the caret moves into an insertion, a deletion, or a substitution, the editor now announces it through a polite live region ("Insertion: …", "Deletion: …", "Replacement: old, replaced by new"), localizable through `@dojo-ng/i18n`. Typing never triggers an announcement.
