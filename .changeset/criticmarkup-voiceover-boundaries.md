---
"@dojo-ng/rich-text-criticmarkup": patch
---

Screen readers now announce suggested insertions and deletions. VoiceOver read the text inside `<ins>`/`<del>` as plain text and ran a substitution's two halves together; each mark now speaks "insertion start"/"insertion end" and "deletion start"/"deletion end" (localizable through `@dojo-ng/i18n`) through visually hidden generated content, which never enters the text, the selection, or the value.
