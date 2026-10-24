---
"@dojo-ng/tree": minor
---

Add `TreeNode.path`, `track` and `basePath`. Selecting a node with a path dispatches `dj-navigate`; with `track` the tree follows `nav:location`, selects the matching node, expands its ancestors and annotates the location with the trail. Modified clicks on a path node open it in a new tab. Needs `@dojo-ng/history` for navigation; without it the tree behaves as before.
