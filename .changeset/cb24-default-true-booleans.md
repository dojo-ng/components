---
"@dojo-ng/dojo-element": patch
"@dojo-ng/alert": patch
"@dojo-ng/carousel": patch
"@dojo-ng/dialog": patch
"@dojo-ng/loading-indicator": patch
"@dojo-ng/popup": patch
"@dojo-ng/radio": patch
"@dojo-ng/slide-pane": patch
"@dojo-ng/slider": patch
"@dojo-ng/title-pane": patch
"@dojo-ng/trigger-popup": patch
"@dojo-ng/typeahead": patch
---

Boolean properties that default to `true` can now be turned off from HTML (CB24). Before, any present attribute read as `true`, so `<dj-dialog closeable="false">` stayed closeable. Now the attribute value `"false"` (any case) means `false`, any other value means `true`, and leaving the attribute out keeps the `true` default. This covers dialog `closeable`/`underlay`, slide-pane `underlay`, popup `scroll-lock`, carousel `nav`, trigger-popup `match-width`, title-pane `closeable`, slider `show-output`, radio `tabbable`, typeahead `strict`, alert `open`, and loading-indicator `active`. `@dojo-ng/dojo-element` exports the converter as `defaultTrueBoolean`.
