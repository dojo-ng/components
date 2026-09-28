---
"@dojo-ng/rich-text": patch
---

The toolbar now wraps onto more than one row (`flex-wrap: wrap`) instead of overflowing its host
horizontally with no way to reach the items past the edge. Found in a real consumer (NovelMaker):
a host that keeps the editor in a narrow reading column, plus a few plugins each contributing a
handful of toolbar items, ran the last several items off-screen with no scroll affordance short of
widening the whole browser window.
