---
"@dojo-ng/rich-text": patch
---

Fix a paste sanitizer bypass. `sanitizeHtml` now drops `javascript:`, `data:`, and other unsafe URLs that hide their scheme with tabs, newlines, or control characters, such as `java&#9;script:` or a leading `\x01`. Browsers ignore those characters when they parse a URL, so the old check saw a relative link while the browser ran `javascript:`. The check now removes them before testing the scheme. Safe links keep their original value.
