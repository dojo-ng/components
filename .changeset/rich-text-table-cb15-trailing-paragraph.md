---
"@dojo-ng/rich-text-table": patch
---

Keep a paragraph after a table that ends the document, so the caret can always leave the table. Before, only the Insert table command added one. A table that ended up last any other way, such as a `value` that ends in a `<table>` (a reopened draft), a paste, or deleting the line after the table, left no place for the caret after it.
